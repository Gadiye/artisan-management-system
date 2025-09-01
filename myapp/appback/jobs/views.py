# jobs/views.py
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, F, Count, Subquery, OuterRef
from rest_framework.permissions import AllowAny
from collections import defaultdict

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend

from .models import Job, JobItem, JobDelivery, ServiceRate
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
from .filters import JobFilter, JobItemFilter


class JobPagination(PageNumberPagination):
    page_size = 300
    page_size_query_param = 'page_size'
    max_page_size = 500


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
        queryset = Job.objects.all().order_by('-created_date')
        if self.action == 'list':
            service_rate_subquery = ServiceRate.objects.filter(
                product=OuterRef('items__product'),
                service_category=OuterRef('service_category')
            ).values('rate_per_unit')[:1]
            queryset = queryset.annotate(
                total_cost=Sum(
                    F('items__quantity_ordered') * Subquery(service_rate_subquery)
                ),
                total_final_payment=Sum('items__final_payment')
            )
        return queryset

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
            job.update_status()

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
            'in_progress': Job.objects.filter(status='IN_PROGRESS').count(),
            'partially_received': Job.objects.filter(status='PARTIALLY_RECEIVED').count(),
            'completed': Job.objects.filter(status='COMPLETED').count(),
            'total_cost': Job.objects.aggregate(
                total=Sum(F('items__original_amount'))
            )['total'] or 0,
            'total_final_payment': Job.objects.aggregate(
                total=Sum(F('items__final_payment'))
            )['total'] or 0,
        }
        return Response(stats)

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
            # Job status will be updated by job_item.save() itself
        
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
            job.update_status()
        
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

        # --- Create Delivery and Update Parent ---
        with transaction.atomic():
            # Create the delivery record
            delivery = serializer.save(job_item=job_item)
            
            

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
    queryset = JobItem.objects.all().select_related('artisan', 'product', 'job')
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
            job_item.job.update_status()

    def perform_update(self, serializer):
        with transaction.atomic():
            job_item = serializer.save()
            job_item.job.update_status()

    def perform_destroy(self, instance):
        if instance.payslip_generated:
            return Response(
                {"detail": "Cannot delete JobItem as it has an associated payslip. Reset payslip first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            job = instance.job
            instance.delete()
            job.update_status()

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
                delivery = serializer.save()
                return delivery
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
    queryset = ServiceRate.objects.select_related('product').all()
    serializer_class = ServiceRateSerializer
    pagination_class = JobPagination
    permission_classes = [AllowAny] # Adjust permissions as needed
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['service_category', 'product']
    search_fields = ['service_category', 'product__product_type', 'product__animal_type']
    ordering_fields = ['service_category', 'rate_per_unit', 'product__product_type']

    def get_queryset(self):
        return ServiceRate.objects.select_related('product').order_by('product__product_type', 'product__animal_type', 'service_category')

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
        # Get all service rates with related product info
        service_rates = ServiceRate.objects.select_related('product').order_by(
            'product__product_type', 'product__animal_type', 'product__size_category'
        )

        # Group rates by product_type and animal_type
        grouped_rates = defaultdict(list)
        for rate in service_rates:
            key = (rate.product.get_product_type_display(), rate.product.animal_type)
            grouped_rates[key].append(rate)

        # Structure the data for the serializer
        output_data = []
        for (product_category, animal), rates in grouped_rates.items():
            # Further group by size
            rates_by_size = defaultdict(lambda: {'size': ''})
            for rate in rates:
                size = rate.product.get_size_category_display()
                rates_by_size[size]['size'] = size
                rates_by_size[size][rate.service_category.capitalize()] = rate.rate_per_unit
            
            output_data.append({
                'product_category': product_category,
                'animal': animal,
                'rates': list(rates_by_size.values())
            })

        serializer = HierarchicalServiceRateSerializer(output_data, many=True)
        return Response(serializer.data)