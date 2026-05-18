from rest_framework import generics, status, filters, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.db.models import Sum, Avg, Count, OuterRef, Subquery, F, DecimalField
from django.db.models.functions import Coalesce
from decimal import Decimal

from jobs.models import JobItem, Job
from financials.models import Payslip
from .models import Artisan
from .serializers import (
    ArtisanListSerializer, 
    ArtisanDetailSerializer,
    JobItemSerializer,
    PayslipSerializer,
    JobWithPendingPaymentSerializer,
    ArtisanWithPendingPaymentSerializer
)


class ArtisanPagination(PageNumberPagination):
    """Custom pagination for artisan lists"""
    page_size = 300
    page_size_query_param = 'page_size'
    max_page_size = 500





class ArtisanJobsView(generics.ListAPIView):
    """
    GET /api/artisans/{id}/jobs/
    
    Retrieve jobs associated with the artisan.
    """
    serializer_class = JobItemSerializer
    pagination_class = ArtisanPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['job___status', 'job__service_category']
    ordering_fields = ['job__created_date', 'job___status']
    ordering = ['-job__created_date']

    def get_queryset(self):
        """Get jobs for specific artisan"""
        artisan_id = self.kwargs['pk']
        artisan = get_object_or_404(Artisan, pk=artisan_id)
        
        queryset = JobItem.objects.filter(artisan=artisan).select_related('job')
        
        # Optional date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(job__created_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(job__created_date__lte=end_date)
            
        return queryset

    def get_serializer_context(self):
        """Add artisan to serializer context"""
        context = super().get_serializer_context()
        context['artisan_id'] = self.kwargs['pk']
        return context


class ArtisanPayslipsView(generics.ListAPIView):
    """
    GET /api/artisans/{id}/payslips/
    
    Retrieve payslips for the artisan.
    """
    serializer_class = PayslipSerializer
    pagination_class = ArtisanPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['generated_date', 'total_payment']
    ordering = ['-generated_date']  # Most recent first

    def get_queryset(self):
        """Get payslips for specific artisan"""
        artisan_id = self.kwargs['pk']
        artisan = get_object_or_404(Artisan, pk=artisan_id)
        
        queryset = Payslip.objects.filter(artisan=artisan)
        
        # Optional date range filtering
        period_start = self.request.query_params.get('period_start')
        period_end = self.request.query_params.get('period_end')
        
        if period_start:
            queryset = queryset.filter(period_start__gte=period_start)
        if period_end:
            queryset = queryset.filter(period_end__lte=period_end)
            
        return queryset


# Alternative function-based views for specific operations
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_artisan(request, pk):
    """
    POST /api/artisans/{id}/activate/
    
    Activate an artisan (set is_active=True).
    """
    try:
        artisan = Artisan.objects.get(pk=pk)
        artisan.is_active = True
        artisan.save()
        
        serializer = ArtisanSerializer(artisan)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Artisan.DoesNotExist:
        return Response(
            {"error": "Artisan not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deactivate_artisan(request, pk):
    """
    POST /api/artisans/{id}/deactivate/
    
    Deactivate an artisan (set is_active=False).
    """
    try:
        artisan = Artisan.objects.get(pk=pk)
        
        # Check for active jobs before deactivation
        active_jobs = JobItem.objects.filter(artisan=artisan, job___status='IN_PROGRESS').exists()
        if active_jobs:
            return Response(
                {"error": "Cannot deactivate artisan with active job items."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        artisan.is_active = False
        artisan.save()
        
        serializer = ArtisanSerializer(artisan)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Artisan.DoesNotExist:
        return Response(
            {"error": "Artisan not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def artisan_metadata(request):
    """
    GET /api/artisans/metadata/
    
    Provide metadata for artisan-related operations.
    """
    metadata = {
        "status_choices": [
            {"value": True, "label": "Active"},
            {"value": False, "label": "Inactive"}
        ],
        "phone_format": "International format recommended (e.g., +1234567890)",
        "search_fields": ["name"],
        "filterable_fields": ["is_active"],
        "sortable_fields": ["name", "created_date"]
    }
    
    return Response(metadata, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def artisan_stats(request, pk):
    """
    GET /api/artisans/{id}/stats/
    
    Get statistics for a specific artisan.
    """
    try:
        artisan = Artisan.objects.get(pk=pk)
        
        # Calculate stats
        total_jobs = JobItem.objects.filter(artisan=artisan).count()
        completed_jobs = JobItem.objects.filter(artisan=artisan, job___status='COMPLETED').count()
        in_progress_jobs = JobItem.objects.filter(artisan=artisan, job___status='IN_PROGRESS').count()
        total_payslips = Payslip.objects.filter(artisan=artisan).count()
        
        # Calculate total earnings
        total_earnings = sum(
            payslip.total_payment for payslip in Payslip.objects.filter(artisan=artisan)
        )
        
        stats = {
            "artisan_id": artisan.id,
            "artisan_name": artisan.name,
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "in_progress_jobs": in_progress_jobs,
            "total_payslips": total_payslips,
            "total_earnings": total_earnings,
            "is_active": artisan.is_active,
            "member_since": artisan.created_date
        }
        
        return Response(stats, status=status.HTTP_200_OK)
    except Artisan.DoesNotExist:
        return Response(
            {"error": "Artisan not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


class ArtisanViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_date']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ArtisanListSerializer
        return ArtisanDetailSerializer

    def get_queryset(self):
        queryset = Artisan.objects.all()

        if self.action != 'list':
            # Apply expensive annotations only for detail view
            last_job_date_subquery = JobItem.objects.filter(
                artisan=OuterRef('pk')
            ).order_by('-job__created_date').values('job__created_date')[:1]

            pending_payment_subquery = JobItem.objects.filter(
                artisan=OuterRef('pk'),
                payslip_generated=False,
                job___status='COMPLETED'
            ).values('artisan').annotate(
                total_pending=Sum('final_payment')
            ).values('total_pending')

            queryset = queryset.annotate(
                total_jobs=Coalesce(Count('jobitem', distinct=True), 0),
                average_rating=Coalesce(Avg('jobitem__rating'), Decimal('0.0'), output_field=DecimalField()),
                total_earnings=Coalesce(Sum('payslip__total_payment'), Decimal('0.0'), output_field=DecimalField()),
                last_job_date=Subquery(last_job_date_subquery),
                pending_payment=Coalesce(Subquery(pending_payment_subquery, output_field=DecimalField()), Decimal('0.0'))
            )
        
        return queryset

    @action(detail=False, methods=['get'], url_path='with-pending-payments')
    def with_pending_payments(self, request):
        """
        GET /api/artisans/with-pending-payments/
        
        Retrieve artisans who have pending payments.
        """
        artisans_with_pending_payments = Artisan.objects.filter(
            jobitem__payslip_generated=False,
            jobitem__quantity_accepted__gt=0
        ).distinct().annotate(
            pending_payment_total=Sum('jobitem__final_payment')
        )

        serializer = ArtisanWithPendingPaymentSerializer(artisans_with_pending_payments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='pending-payments')
    def pending_payments(self, request, pk=None):
        """
        GET /api/artisans/{id}/pending-payments/
        
        Retrieve jobs with pending payments for a specific artisan.
        """
        artisan = self.get_object()
        
        pending_job_items = JobItem.objects.filter(
            artisan=artisan,
            payslip_generated=False,
            quantity_accepted__gt=0
        ).values('job').annotate(
            pending_payment=Sum('final_payment')
        )

        job_ids = [item['job'] for item in pending_job_items]
        jobs = Job.objects.filter(job_id__in=job_ids).prefetch_related('items')

        # Create a dictionary to map job_id to pending_payment
        pending_payments_map = {item['job']: item['pending_payment'] for item in pending_job_items}

        # Add the pending_payment to each job object
        for job in jobs:
            job.pending_payment = pending_payments_map.get(job.job_id)

        serializer = JobWithPendingPaymentSerializer(jobs, many=True)
        return Response(serializer.data)

