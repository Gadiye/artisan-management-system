# jobs/views.py
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, F, Count, Subquery, OuterRef, Value, Case, When, DecimalField
from django.db.models.functions import Cast, Coalesce
from rest_framework.permissions import AllowAny
from collections import defaultdict

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.dateparse import parse_date
from django.conf import settings

from .models import Job, JobItem, JobDelivery, ServiceRate
from inventory.models import Inventory, FinishedStock
from orders.models import OrderItem
from .serializers import (
    JobListSerializer,
    JobDetailSerializer,
    JobCreateUpdateSerializer,
    JobItemDetailListSerializer,
    JobItemCreateUpdateSerializer,
    JobItemDeliverySerializer,
    ServiceRateSerializer,
    HierarchicalServiceRateSerializer,
)
from products.models import Product
from .filters import JobFilter, JobItemFilter


from .services import record_job_delivery, update_job_status


class JobPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Job resources.
    Supports CRUD operations for Jobs.
    Nested routes for JobItems management.
    """
    pagination_class = JobPagination
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobFilter
    search_fields = ['job_id', 'created_by', 'notes']
    ordering_fields = ['created_date', 'status', 'service_category', 'total_cost', 'total_final_payment']
    lookup_field = 'job_id'

    def get_queryset(self):
        # Select service_category and prefetch items and artisans to completely eliminate the N+1 query bottleneck
        return Job.objects.select_related('service_category').prefetch_related('items__artisan').all().order_by('-created_date')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prefetch service rates for the current category to avoid N+1 in serializer
        from .models import ServiceRate
        rates = ServiceRate.objects.filter(service_category=instance.service_category)
        
        # We can't easily use prefetch_related for this specific logic because of the category filter
        # But we can pass them in context
        serializer = self.get_serializer(instance, context={
            'request': request,
            'service_rates': {r.product_id: r.rate_per_unit for r in rates}
        })
        return Response(serializer.data)

    def get_serializer_class(self):
        if self.action == 'list':
            return JobListSerializer
        elif self.action == 'retrieve':
            return JobDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return JobCreateUpdateSerializer
        return JobListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user.username)

    def perform_update(self, serializer):
        with transaction.atomic():
            job = serializer.save()
            update_job_status(job)

    def perform_destroy(self, instance):
        # Check if any job items have generated payslips
        if instance.items.filter(payslip_generated=True).exists():
            return Response(
                {"detail": "Cannot delete job as it has items with generated payslips. Reset payslips first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.delete()

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        GET /api/jobs/dashboard/
        Get job statistics and summary data.
        """
        stats = {
            'total_jobs': Job.objects.count(),
            'in_progress': Job.objects.filter(_status='IN_PROGRESS').count(),
            'partially_received': Job.objects.filter(_status='PARTIALLY_RECEIVED').count(),
            'completed': Job.objects.filter(_status='COMPLETED').count(),
            'total_cost': Job.objects.aggregate(
                total=Sum(F('items__original_amount'))
            )['total'] or 0,
            'total_final_payment': Job.objects.aggregate(
                total=Sum(F('items__final_payment'))
            )['total'] or 0,
        }
        return Response(stats)

    @action(detail=False, methods=['get'], url_path='production-guide')
    def production_guide(self, request):
        """
        GET /api/jobs/production-guide/
        Returns aggregated product and artisan workload data for the UI.
        """
        products = Product.objects.filter(is_active=True).values(
            'id', 'product_type', 'animal_type', 'size_category'
        )
        
        # 1. Bulk demand (Order Items)
        demand_qs = OrderItem.objects.filter(
            order__status__in=['PENDING', 'PROCESSING']
        ).values('product_id').annotate(total=Sum('quantity'))
        demand_map = {item['product_id']: item['total'] for item in demand_qs}

        # 2. Bulk stock (Finished Stock)
        stock_qs = FinishedStock.objects.filter(
            is_active=True
        ).values('product_id').annotate(total=Sum('quantity'))
        stock_map = {item['product_id']: item['total'] for item in stock_qs}

        # 3. Bulk inventory (Inventory)
        inv_qs = Inventory.objects.filter(
            is_active=True, quantity__gt=0
        ).values('product_id', 'service_category').annotate(total=Sum('quantity'))
        inv_map = defaultdict(dict)
        for inv in inv_qs:
            inv_map[inv['product_id']][inv['service_category']] = inv['total']

        # 4. Bulk Work In Progress (Job Items)
        wip_qs = JobItem.objects.filter(
            job___status='IN_PROGRESS', 
            quantity_received__lt=F('quantity_ordered')
        ).values('product_id', 'job__service_category').annotate(
            ordered=Sum('quantity_ordered'), 
            received=Sum('quantity_received')
        )
        wip_map = defaultdict(lambda: defaultdict(int))
        for wip in wip_qs:
            wip_map[wip['product_id']][wip['job__service_category']] += (wip['ordered'] - wip['received'])

        product_data = []

        for p in products:
            pid = p['id']
            demand = demand_map.get(pid, 0)
            stock = stock_map.get(pid, 0)
            p_inv = inv_map.get(pid, {})
            p_wip = dict(wip_map.get(pid, {}))

            product_data.append({
                'id': pid,
                'product_type': p['product_type'],
                'animal_type': p['animal_type'],
                'size_category': p['size_category'],
                'stock': stock,
                'total_ordered': demand,
                'inventory': p_inv,
                'in_production': p_wip
            })

        # Artisan Workload
        artisan_qs = JobItem.objects.filter(
            job___status='IN_PROGRESS',
            quantity_received__lt=F('quantity_ordered')
        ).select_related('artisan', 'product', 'job')

        workload_map = defaultdict(lambda: {'name': '', 'total_units': 0, 'items': []})
        for item in artisan_qs:
            pending_qty = item.quantity_ordered - item.quantity_received
            if pending_qty <= 0:
                continue

            art_id = item.artisan.id
            if not workload_map[art_id]['name']:
                workload_map[art_id]['name'] = item.artisan.name
                
            workload_map[art_id]['total_units'] += pending_qty
            
            # Check if this artist already has an entry for this product + category
            existing_item = next(
                (i for i in workload_map[art_id]['items'] 
                 if i['product_id'] == item.product.id and i['category'] == item.job.service_category),
                None
            )

            if existing_item:
                existing_item['quantity'] += pending_qty
            else:
                workload_map[art_id]['items'].append({
                    'product_id': item.product.id,
                    'category': item.job.service_category,
                    'quantity': pending_qty
                })

        artisan_workload = sorted(list(workload_map.values()), key=lambda x: x['total_units'], reverse=True)

        return Response({
            'products': product_data,
            'artisan_workload': artisan_workload
        })

    @action(detail=False, methods=['get'], url_path='comprehensive-reports')
    def comprehensive_reports(self, request):
        """
        GET /api/jobs/comprehensive-reports/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        Returns aggregated data for the reporting dashboard.
        """
        from datetime import datetime
        from django.utils.timezone import make_aware

        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # Filter querysets based on dates
        orders = OrderItem.objects.all()
        deliveries = JobDelivery.objects.all()
        job_items = JobItem.objects.all()

        if start_date_str and end_date_str:
            try:
                # Use naive datetime and let Django handle the timezone based on USE_TZ
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
                
                # Make end_date include the full day
                if hasattr(datetime, "replace"):
                   end_date = end_date.replace(hour=23, minute=59, second=59)

                if getattr(settings, 'USE_TZ', False):
                    start_date = make_aware(start_date)
                    end_date = make_aware(end_date)
                   
                orders = orders.filter(order__created_date__range=[start_date, end_date])
                deliveries = deliveries.filter(delivery_date__range=[start_date, end_date])
                job_items = job_items.filter(job__created_date__range=[start_date, end_date])
            except ValueError:
                pass # Ignore invalid dates

        # --- Summary Metrics ---
        total_revenue = orders.annotate(
            line_total=F('quantity') * F('unit_price')
        ).aggregate(total=Sum('line_total'))['total'] or 0

        production_volume = deliveries.aggregate(total=Sum('quantity_accepted'))['total'] or 0
        total_received = deliveries.aggregate(total=Sum('quantity_received'))['total'] or 0
        
        quality_rate = (production_volume / total_received * 100) if total_received > 0 else 0

        active_artisans = job_items.filter(quantity_received__lt=F('quantity_ordered'), job___status='IN_PROGRESS').values('artisan').distinct().count()

        # --- Production by Product Category ---
        prod_by_category = deliveries.values(
            category_name=F('job_item__product__product_type')
        ).annotate(
            value=Sum('quantity_accepted')
        ).order_by('-value')[:5]

        # --- Top Artisans ---
        top_artisans = job_items.values(
            name=F('artisan__name')
        ).annotate(
            items=Sum('quantity_accepted'),
            total_received=Sum('quantity_received'),
            value=Sum('final_payment')
        ).filter(items__gt=0).order_by('-items')[:5]

        artisan_data = []
        for a in top_artisans:
            rate = (a['items'] / a['total_received'] * 100) if a['total_received'] and a['total_received'] > 0 else 0
            artisan_data.append({
                'name': a['name'],
                'items': a['items'],
                'quality': f"{rate:.1f}%",
                'value': a['value'] or 0
            })

        # --- Financial / Revenue ---
        revenue_by_category = orders.values(
            category_name=F('product__product_type')
        ).annotate(
            value=Sum(F('quantity') * F('unit_price'), output_field=DecimalField(max_digits=20, decimal_places=2))
        ).order_by('-value')[:5]

        # Real cost estimation using final_payment from job items for those product categories
        cost_by_category = job_items.filter(
            quantity_accepted__gt=0
        ).values(
            category_name=F('product__product_type')
        ).annotate(
            total_cost=Sum('final_payment', output_field=DecimalField(max_digits=20, decimal_places=2))
        )
        cost_map = {item['category_name']: float(item['total_cost'] or 0) for item in cost_by_category}

        # Financial Summary Table
        fin_sum_data = []
        for fs in revenue_by_category:
            cat_name = fs['category_name']
            revenue = float(fs['value'] or 0)
            cost = cost_map.get(cat_name, 0.0)
            margin_pct = ((revenue - cost) / revenue * 100) if revenue > 0 else 0
            
            fin_sum_data.append({
                'category': cat_name,
                'revenue': revenue,
                'cost': cost,
                'margin': f"{margin_pct:.1f}%"
            })

        # --- Quality ---
        total_rejected = total_received - production_volume
        quality_metrics = [
            {'label': 'Accepted', 'value': float(f"{quality_rate:.1f}"), 'color': 'bg-green-500'},
            {'label': 'Rejected', 'value': float(f"{100 - quality_rate:.1f}"), 'color': 'bg-red-500'}
        ]

        rejection_analysis = deliveries.filter(
            rejection_reason__isnull=False,
            quantity_received__gt=F('quantity_accepted')
        ).annotate(
            rejected_qty=F('quantity_received') - F('quantity_accepted'),
            lost_value=Cast(F('quantity_received') - F('quantity_accepted'), output_field=DecimalField(max_digits=20, decimal_places=2)) * F('job_item__product__base_price')
        ).values(
            'rejection_reason'
        ).annotate(
            count=Sum('rejected_qty'),
            impact=Sum('lost_value', output_field=DecimalField(max_digits=20, decimal_places=2))
        ).order_by('-count')

        rejection_data = []
        for r in rejection_analysis:
             r_count = r['count'] or 0
             pct = (r_count / total_rejected * 100) if total_rejected > 0 else 0
             impact = float(r['impact'] or 0)
             
             reason_display = dict(JobItem.REJECTION_REASONS).get(r['rejection_reason'], 'Unknown')

             rejection_data.append({
                 'reason': reason_display,
                 'count': r_count,
                 'percent': f"{pct:.0f}%",
                 'impact': impact
             })

        # --- Trends ---
        from django.db.models.functions import TruncMonth
        trends = deliveries.annotate(
            month=TruncMonth('delivery_date')
        ).values('month').annotate(
            value=Sum('quantity_accepted')
        ).order_by('month')
        
        months_display = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        trend_data = []
        for t in trends:
            if t['month']:
               trend_data.append({
                   'month': months_display[t['month'].month - 1],
                   'value': t['value'] or 0
               })

        # Calculate Average Process Time (Cycle Time)
        from django.db.models import Avg, ExpressionWrapper, fields
        avg_duration = deliveries.annotate(
            duration=ExpressionWrapper(
                F('delivery_date') - F('job_item__job__created_date'),
                output_field=fields.DurationField()
            )
        ).aggregate(avg_time=Avg('duration'))['avg_time']
        
        avg_process_days = 4.2  # Dynamic fallback
        if avg_duration:
            avg_process_days = round(avg_duration.total_seconds() / 86400.0, 1)

        return Response({
            'summary': {
                'total_revenue': float(total_revenue),
                'production_volume': production_volume,
                'quality_rate': float(f"{quality_rate:.1f}"),
                'active_artisans': active_artisans,
                'avg_process_time': avg_process_days
            },
            'production': {
                'by_category': list(prod_by_category),
                'top_artisans': artisan_data
            },
            'financial': {
                'revenue_by_category': list(revenue_by_category),
                'summary': fin_sum_data
            },
            'quality': {
                'metrics': quality_metrics,
                'rejections': rejection_data
            },
            'trends': {
                'monthly': trend_data
            }
        })

    # --- Nested JobItem Actions ---

    @action(detail=True, methods=['get'], url_path='items')
    def list_job_items(self, request, job_id=None):
        """
        GET /api/jobs/{job_id}/items/
        List all JobItems for a specific Job.
        """
        job = self.get_object()
        queryset = job.items.all().select_related('artisan', 'product').order_by('id')

        # Apply JobItemFilter
        filter_instance = JobItemFilter(request.query_params, queryset=queryset)
        queryset = filter_instance.qs

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = JobItemDetailListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = JobItemDetailListSerializer(queryset, many=True)
        return Response(serializer.data)

    

    @action(detail=True, methods=['get'], url_path='items/(?P<item_pk>[^/.]+)')
    def retrieve_job_item(self, request, job_id=None, item_pk=None):
        """
        GET /api/jobs/{job_id}/items/{item_pk}/
        Retrieve a specific JobItem for a Job.
        """
        job = self.get_object()
        job_item = get_object_or_404(
            JobItem.objects.select_related('artisan', 'product'), 
            job=job, 
            pk=item_pk
        )
        serializer = JobItemDetailListSerializer(job_item)
        return Response(serializer.data)

    @action(detail=True, methods=['put', 'patch'], url_path='items/(?P<item_pk>[^/.]+)')
    def update_job_item(self, request, job_id=None, item_pk=None):
        """
        PUT/PATCH /api/jobs/{job_id}/items/{item_pk}/
        Update a specific JobItem for a Job.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        
        partial = request.method == 'PATCH'
        serializer = JobItemCreateUpdateSerializer(job_item, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated_job_item = serializer.save()
            update_job_status(updated_job_item.job)
        
        return Response(JobItemDetailListSerializer(updated_job_item).data)

    @action(detail=True, methods=['delete'], url_path='items/(?P<item_pk>[^/.]+)')
    def destroy_job_item(self, request, job_id=None, item_pk=None):
        """
        DELETE /api/jobs/{job_id}/items/{item_pk}/
        Delete a specific JobItem for a Job.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        
        with transaction.atomic():
            if job_item.payslip_generated:
                return Response(
                    {"detail": "Cannot delete JobItem as it has an associated payslip. Reset payslip first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            job_item.delete()
            update_job_status(job)
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='items/(?P<item_pk>[^/.]+)/reset-payslip')
    def reset_job_item_payslip(self, request, job_id=None, item_pk=None):
        """
        POST /api/jobs/{job_id}/items/{item_pk}/reset-payslip/
        Reset payslip status for a JobItem.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        
        with transaction.atomic():
            job_item.payslip_generated = False
            job_item.save()
        
        return Response({"detail": "Payslip status reset successfully"})

    # --- JobDelivery Actions ---

    @action(detail=True, methods=['get'], url_path='items/(?P<item_pk>[^/.]+)/deliveries')
    def list_job_item_deliveries(self, request, job_id=None, item_pk=None):
        """
        GET /api/jobs/{job_id}/items/{item_pk}/deliveries/
        List all deliveries for a specific JobItem.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        queryset = job_item.deliveries.all().order_by('-delivery_date')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = JobItemDeliverySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = JobItemDeliverySerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='items/(?P<item_pk>[^/.]+)/deliveries')
    def create_job_item_delivery(self, request, job_id=None, item_pk=None):
        """
        POST /api/jobs/{job_id}/items/{item_pk}/deliveries/
        Record a new delivery for a specific JobItem.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)

        # --- Validation ---
        remaining_quantity = job_item.quantity_ordered - job_item.quantity_received
        if remaining_quantity <= 0:
            return Response(
                {"detail": "This item has already been fully received."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = JobItemDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity_received = serializer.validated_data.get('quantity_received', 0)
        if quantity_received > remaining_quantity:
            return Response(
                {"detail": f"Cannot receive {quantity_received} pieces. Only {remaining_quantity} pieces remain."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Create Delivery and Update Parent via Service ---
        with transaction.atomic():
            delivery = record_job_delivery(
                job_item=job_item,
                quantity_received=quantity_received,
                quantity_accepted=serializer.validated_data.get('quantity_accepted', 0),
                rejection_reason=serializer.validated_data.get('rejection_reason'),
                notes=serializer.validated_data.get('notes')
            )

            # Return the UPDATED JobItem, which is more useful for the frontend
            response_serializer = JobItemDetailListSerializer(job_item)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='items/(?P<item_pk>[^/.]+)/deliveries/(?P<delivery_pk>[^/.]+)')
    def retrieve_job_item_delivery(self, request, job_id=None, item_pk=None, delivery_pk=None):
        """
        GET /api/jobs/{job_id}/items/{item_pk}/deliveries/{delivery_pk}/
        Retrieve a specific delivery for a JobItem.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        delivery = get_object_or_404(JobDelivery, job_item=job_item, pk=delivery_pk)
        
        serializer = JobItemDeliverySerializer(delivery)
        return Response(serializer.data)

    @action(detail=True, methods=['put', 'patch'], url_path='items/(?P<item_pk>[^/.]+)/deliveries/(?P<delivery_pk>[^/.]+)')
    def update_job_item_delivery(self, request, job_id=None, item_pk=None, delivery_pk=None):
        """
        PUT/PATCH /api/jobs/{job_id}/items/{item_pk}/deliveries/{delivery_pk}/
        Update a specific delivery for a JobItem.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        delivery = get_object_or_404(JobDelivery, job_item=job_item, pk=delivery_pk)
        
        partial = request.method == 'PATCH'
        serializer = JobItemDeliverySerializer(delivery, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # This updates the delivery... 
            updated_delivery = serializer.save()

            # Return the UPDATED JobItem, which is more useful for the frontend
            response_serializer = JobItemDetailListSerializer(job_item)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='items/(?P<item_pk>[^/.]+)/deliveries/(?P<delivery_pk>[^/.]+)')
    def destroy_job_item_delivery(self, request, job_id=None, item_pk=None, delivery_pk=None):
        """
        DELETE /api/jobs/{job_id}/items/{item_pk}/deliveries/{delivery_pk}/
        Delete a specific delivery for a JobItem.
        """
        job = self.get_object()
        job_item = get_object_or_404(JobItem, job=job, pk=item_pk)
        delivery = get_object_or_404(JobDelivery, job_item=job_item, pk=delivery_pk)
        
        with transaction.atomic():
            delivery.delete()
            # Recalculate JobItem totals
            job_item.quantity_received = sum(d.quantity_received for d in job_item.deliveries.all())
            job_item.quantity_accepted = sum(d.quantity_accepted for d in job_item.deliveries.all())
            job_item.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='summary')
    def job_summary(self, request, job_id=None):
        """
        GET /api/jobs/{job_id}/summary/
        Get detailed summary of a specific job.
        """
        job = self.get_object()
        
        # Get items summary
        items_summary = job.items.aggregate(
            total_items=Count('id'),
            total_ordered=Sum('quantity_ordered'),
            total_received=Sum('quantity_received'),
            total_accepted=Sum('quantity_accepted'),
            total_original_amount=Sum('original_amount'),
            total_final_payment=Sum('final_payment')
        )
        
        # Get delivery summary
        delivery_summary = JobDelivery.objects.filter(job_item__job=job).aggregate(
            total_deliveries=Count('id'),
            total_delivered=Sum('quantity_received'),
            total_accepted_delivered=Sum('quantity_accepted')
        )
        
        # Get artisan summary
        artisan_summary = job.items.values('artisan__name').annotate(
            total_items=Count('id'),
            total_ordered=Sum('quantity_ordered'),
            total_received=Sum('quantity_received'),
            total_accepted=Sum('quantity_accepted'),
            total_payment=Sum('final_payment')
        ).order_by('-total_payment')
        
        summary_data = {
            'job': JobDetailSerializer(job).data,
            'items_summary': items_summary,
            'delivery_summary': delivery_summary,
            'artisan_summary': list(artisan_summary)
        }
        
        return Response(summary_data)


class JobItemViewSet(viewsets.ModelViewSet):
    """
    Standalone ViewSet for JobItem resources.
    Provides direct access to JobItems across all jobs.
    """
    queryset = JobItem.objects.all().select_related('artisan', 'product', 'job').prefetch_related('product__job_service_rates')
    serializer_class = JobItemDetailListSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobItemFilter
    search_fields = ['artisan__name', 'product__product_type', 'job__job_id']
    ordering_fields = ['job__created_date', 'artisan__name', 'product__product_type', 'quantity_ordered']
    pagination_class = JobPagination

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return JobItemCreateUpdateSerializer
        return JobItemDetailListSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            job_item = serializer.save()
            update_job_status(job_item.job)

    def perform_update(self, serializer):
        with transaction.atomic():
            job_item = serializer.save()
            update_job_status(job_item.job)

    def perform_destroy(self, instance):
        if instance.payslip_generated:
            return Response(
                {"detail": "Cannot delete JobItem as it has an associated payslip. Reset payslip first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            job = instance.job
            instance.delete()
            update_job_status(job)

    @action(detail=False, methods=['get'], url_path='pending-delivery')
    def pending_delivery(self, request):
        """
        GET /api/job-items/pending-delivery/
        Get all job items that have pending deliveries.
        """
        queryset = self.get_queryset().filter(
            quantity_received__lt=F('quantity_ordered')
        ).order_by('-job__created_date')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending-payslip')
    def pending_payslip(self, request):
        """
        GET /api/job-items/pending-payslip/
        Get all job items that have pending payslip generation.
        """
        queryset = self.get_queryset().filter(
            payslip_generated=False,
            quantity_accepted__gt=0
        ).order_by('-job__created_date')
        
        for backend in self.filter_backends:
            queryset = backend().filter_queryset(self.request, queryset, self)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='generate-payslip')
    def generate_payslip(self, request, pk=None):
        """
        POST /api/job-items/{pk}/generate-payslip/
        Mark a job item as having payslip generated.
        """
        job_item = self.get_object()
        
        if job_item.quantity_accepted == 0:
            return Response(
                {"detail": "Cannot generate payslip for item with zero accepted quantity."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            job_item.payslip_generated = True
            job_item.save()
        
        return Response({"detail": "Payslip generated successfully"})

    @action(detail=True, methods=['post'], url_path='reset-payslip')
    def reset_payslip(self, request, pk=None):
        """
        POST /api/job-items/{pk}/reset-payslip/
        Reset payslip status for a job item.
        """
        job_item = self.get_object()
        
        with transaction.atomic():
            job_item.payslip_generated = False
            job_item.save()
        
        return Response({"detail": "Payslip status reset successfully"})


class JobDeliveryViewSet(viewsets.ModelViewSet):
    """
    Standalone ViewSet for JobDelivery resources.
    Provides direct access to all deliveries across all jobs.
    """
    queryset = JobDelivery.objects.all().select_related('job_item__job', 'job_item__artisan', 'job_item__product')
    serializer_class = JobItemDeliverySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['job_item__artisan__name', 'job_item__product__product_type', 'job_item__job__job_id']
    ordering_fields = ['delivery_date', 'quantity_received', 'quantity_accepted']
    pagination_class = JobPagination

    def perform_create(self, serializer):
        with transaction.atomic():
            try:
                # Use the service to handle side effects
                delivery = record_job_delivery(
                    job_item=serializer.validated_data['job_item'],
                    quantity_received=serializer.validated_data['quantity_received'],
                    quantity_accepted=serializer.validated_data.get('quantity_accepted', 0),
                    rejection_reason=serializer.validated_data.get('rejection_reason'),
                    notes=serializer.validated_data.get('notes')
                )
                return delivery
            except ValueError as e:
                # This might need to be handled differently in perform_create 
                # as it's not expected to return a Response object
                raise serializers.ValidationError({"detail": str(e)})

    def perform_update(self, serializer):
        with transaction.atomic():
            try:
                delivery = serializer.save()
                return delivery
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_destroy(self, instance):
        with transaction.atomic():
            job_item = instance.job_item
            instance.delete()
            # Recalculate JobItem totals
            job_item.quantity_received = sum(d.quantity_received for d in job_item.deliveries.all())
            job_item.quantity_accepted = sum(d.quantity_accepted for d in job_item.deliveries.all())
            job_item.save()

    @action(detail=False, methods=['get'], url_path='recent')
    def recent_deliveries(self, request):
        """
        GET /api/job-deliveries/recent/
        Get recent deliveries (last 30 days).
        """
        from datetime import datetime, timedelta
        
        thirty_days_ago = datetime.now() - timedelta(days=30)
        queryset = self.get_queryset().filter(
            delivery_date__gte=thirty_days_ago
        ).order_by('-delivery_date')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='with-rejections')
    def with_rejections(self, request):
        """
        GET /api/job-deliveries/with-rejections/
        Get deliveries that have rejections.
        """
        queryset = self.get_queryset().filter(
            quantity_received__gt=F('quantity_accepted')
        ).order_by('-delivery_date')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ServiceRateViewSet(viewsets.ModelViewSet):
    queryset = ServiceRate.objects.select_related('product__product_type', 'product__size_category', 'service_category').all()
    serializer_class = ServiceRateSerializer
    pagination_class = JobPagination
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['service_category', 'product']
    search_fields = ['service_category__name', 'product__product_type__name', 'product__animal_type']
    ordering_fields = ['service_category__name', 'rate_per_unit', 'product__product_type__name']

    def get_queryset(self):
        return ServiceRate.objects.select_related('product__product_type', 'product__size_category', 'service_category').order_by('product__product_type__name', 'product__animal_type', 'service_category__name')

    def perform_create(self, serializer):
        # Custom logic for creating a service rate
        serializer.save()

    def perform_update(self, serializer):
        # Custom logic for updating a service rate
        serializer.save()

    def perform_destroy(self, instance):
        # Custom logic for deleting a service rate
        instance.delete()

    @action(detail=False, methods=['get'], url_path='hierarchical')
    def hierarchical_rates(self, request):
        """
        GET /api/service-rates/hierarchical/
        Returns a hierarchical view of service rates, grouped by product and animal.
        """
        service_rates = ServiceRate.objects.select_related('product__product_type', 'product__size_category', 'service_category').values(
            'product__product_type__name',
            'product__product_type__display_name',
            'product__animal_type',
            'product__size_category__name',
            'product__size_category__display_name',
            'service_category__name',
            'service_category__display_name',
            'rate_per_unit'
        ).order_by(
            'product__product_type__name', 'product__animal_type', 'product__size_category__name'
        )

        grouped_rates = defaultdict(list)
        for rate in service_rates:
            pt_disp = rate['product__product_type__display_name'] or rate['product__product_type__name'] or ''
            key = (pt_disp, rate['product__animal_type'])
            grouped_rates[key].append(rate)

        output_data = []
        for (product_category, animal), rates in grouped_rates.items():
            rates_by_size = defaultdict(lambda: {'size': ''})
            for rate in rates:
                size = rate['product__size_category__display_name'] or rate['product__size_category__name'] or ''
                cat_name = (rate['service_category__display_name'] or rate['service_category__name'] or '').title()
                rates_by_size[size]['size'] = size
                rates_by_size[size][cat_name] = rate['rate_per_unit']
            
            output_data.append({
                'product_category': product_category,
                'animal': animal,
                'rates': list(rates_by_size.values())
            })

        serializer = HierarchicalServiceRateSerializer(output_data, many=True)
        return Response(serializer.data)