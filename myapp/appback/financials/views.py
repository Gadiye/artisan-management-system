from decimal import Decimal, InvalidOperation
from io import BytesIO
from datetime import datetime

from django.core.files.base import ContentFile
from django.db import transaction
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response

from rest_framework.pagination import PageNumberPagination
from rest_framework import viewsets, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

from artisans.models import Artisan
from .models import ArtisanAdvance, AdvanceDeduction, Payslip, ServiceRate
from jobs.models import JobItem
from products.models import Product
from .serializers import (
    PayslipListSerializer, PayslipDetailSerializer, PayslipCreateUpdateSerializer,
    PayslipGenerateSerializer, JobItemForPayslipSerializer, ServiceRateSerializer,
    ArtisanAdvanceSerializer, AdvanceDeductionSerializer
)
from .filters import PayslipFilter

def generate_payslip_spreadsheet(artisan, job_items, period_start, period_end, service_category=None, total_deductions=Decimal('0.00')):
    buffer = BytesIO()
    wb = Workbook()
    ws = wb.active
    ws.title = "Payslip"

    # Header
    ws.append(["Artisan Payslip"])
    ws.append([f"Artisan: {artisan.name}"])
    if service_category:
        ws.append([f"Service Category: {service_category}"])
    ws.append([f"Period: {period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}"])
    ws.append([])

    # Table Header
    headers = ["Product", "Qty Ordered", "Qty Accepted", "Unit Price", "Final Payment"]
    ws.append(headers)
    for cell in ws[6]:
        cell.font = Font(bold=True)

    # Table Content
    total_payment = Decimal('0.00')
    for item in job_items:
        unit_price = item.final_payment / item.quantity_accepted if item.quantity_accepted > 0 else Decimal('0.00')
        row = [
            str(item.product),
            item.quantity_ordered,
            item.quantity_accepted,
            f"Ksh{unit_price:.2f}",
            f"Ksh{item.final_payment:.2f}",
        ]
        ws.append(row)
        total_payment += item.final_payment

    ws.append([])
    # Total
    ws.append(["Gross Payment", f"Ksh{total_payment:.2f}"])
    if total_deductions > 0:
        ws.append(["Advance Deductions", f"-Ksh{total_deductions:.2f}"])
        ws.append(["Net Payment", f"Ksh{(total_payment - total_deductions):.2f}"])

    wb.save(buffer)
    spreadsheet_content = buffer.getvalue()
    buffer.close()
    return spreadsheet_content, total_payment

def _deduct_advances(artisan, payment_amount, payslip_instance=None):
    """
    Helper function to deduct outstanding advances from a payment amount.
    Returns (remaining_payment, total_deducted_amount).
    """
    total_deducted_amount = Decimal('0.00')
    remaining_payment = payment_amount

    outstanding_advances = ArtisanAdvance.objects.filter(
        artisan=artisan,
        is_settled=False,
        balance__gt=0
    ).order_by('date_given') # Deduct oldest advances first

    for advance in outstanding_advances:
        if remaining_payment <= 0:
            break # No more payment to deduct from

        deductible_from_advance = min(remaining_payment, advance.balance)

        with transaction.atomic():
            advance.balance -= deductible_from_advance
            remaining_payment -= deductible_from_advance
            total_deducted_amount += deductible_from_advance

            if advance.balance <= 0:
                advance.is_settled = True
            advance.save()

            AdvanceDeduction.objects.create(
                advance=advance,
                payslip=payslip_instance,
                amount=deductible_from_advance
            )
    
    return remaining_payment, total_deducted_amount

# --- DRF Views ---

class PayslipPagination(PageNumberPagination):
    """Custom pagination for payslip lists."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PayslipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Payslip resources.
    Supports CRUD, filtering, searching, sorting, and custom actions for:
    - Downloading PDF
    - Listing associated Job Items
    - Generating new payslips from Job Items
    - Providing metadata
    """
    queryset = Payslip.objects.all().select_related('artisan', 'service_category')
    pagination_class = PayslipPagination
    permission_classes = [AllowAny] # Most operations require authentication
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PayslipFilter # Apply the custom filterset
    search_fields = ['artisan__name'] # Search by artisan name
    ordering_fields = ['generated_date', 'total_payment', 'artisan__name', 'period_start', 'period_end']
    ordering = ['-generated_date'] # Default sorting

    def get_serializer_class(self):
        if self.action == 'list':
            return PayslipListSerializer
        elif self.action == 'retrieve':
            return PayslipDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PayslipCreateUpdateSerializer
        elif self.action == 'generate_payslip_from_jobs':
            return PayslipGenerateSerializer
        return PayslipListSerializer # Default for other actions

    def get_serializer_context(self):
        """
        Extra context for serializers.
        Used for building absolute URLs and conditional nested data.
        """
        context = super().get_serializer_context()
        if self.action == 'retrieve':
            context['include_job_items'] = self.request.query_params.get('include_job_items', 'false').lower() == 'true'
        return context

    def perform_destroy(self, instance):
        """
        Custom deletion logic: Delete associated PDF file and reset payslip_generated on JobItems.
        """
        with transaction.atomic():
            # 1. Reset payslip_generated for associated JobItems
            # This is critical. We need to identify exactly which job items
            # were part of THIS payslip. The current Payslip model doesn't store this
            # explicitly. We'll infer based on artisan, period, and if they are marked.
            # A more robust solution might link Payslip to JobItem directly (ManyToMany).
            # For now, we assume any job items marked as generated for this artisan
            # within this payslip's period should be reset.
            JobItem.objects.filter(
                artisan=instance.artisan,
                job__created_date__date__gte=instance.period_start,
                job__created_date__date__lte=instance.period_end,
                payslip_generated=True # Only reset those that were marked
            ).update(payslip_generated=False)

            # 2. Delete the spreadsheet file from storage
            if instance.spreadsheet_file:
                instance.spreadsheet_file.delete(save=False) # delete the file, but don't save the model yet

            # 3. Perform model instance deletion
            instance.delete()

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def download_spreadsheet(self, request, pk=None):
        """
        GET /api/payslips/{id}/download_spreadsheet/
        Allows downloading the payslip's spreadsheet file.
        """
        payslip = self.get_object()
        if not payslip.spreadsheet_file:
            raise Http404("Spreadsheet file not found for this payslip.")

        try:
            with payslip.spreadsheet_file.open('rb') as spreadsheet:
                response = HttpResponse(spreadsheet.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = f'attachment; filename="{payslip.spreadsheet_file.name.split("/")[-1]}"'
                return response
        except FileNotFoundError:
            raise Http404("Spreadsheet file not found on storage.")


    @action(detail=True, methods=['get'])
    def job_items(self, request, pk=None):
        """
        GET /api/payslips/{id}/job-items/
        Retrieve a list of job items associated with the payslip.
        """
        payslip = self.get_object()
        queryset = JobItem.objects.filter(
            artisan=payslip.artisan,
            job__created_date__date__gte=payslip.period_start,
            job__created_date__date__lte=payslip.period_end,
            payslip_generated=True # Crucially, only items marked as generated
            # If you have a specific way to link job items to payslips (e.g., through an intermediary model), use that.
        ).select_related('job', 'product').order_by('-job__created_date') # Default ordering

        # Apply filtering for job items within this action
        job_id = request.query_params.get('job_id')
        if job_id:
            queryset = queryset.filter(job__job_id=job_id)

        product_id = request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product__id=product_id)

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = JobItemForPayslipSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = JobItemForPayslipSerializer(queryset, many=True)
        return Response(serializer.data)


    @action(detail=False, methods=['post'], url_path='generate')
    def generate_payslip_from_jobs(self, request):
        """
        POST /api/payslips/generate/
        Generate a new payslip for an artisan or a bulk of payslips for a service category.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        artisan_id = validated_data.get('artisan_id')
        service_category = validated_data.get('service_category')
        period_start = validated_data['period_start']
        period_end = validated_data['period_end']

        # Ensure period_end is treated as the end of the day for range queries
        period_end_with_time = datetime.combine(period_end, datetime.max.time())

        # Base query for eligible job items
        base_query = JobItem.objects.filter(
            job__created_date__range=[period_start, period_end_with_time],
            quantity_accepted__gt=0,
            payslip_generated=False
        ).select_related('job', 'product', 'artisan')

        if artisan_id:
            # --- Individual Payslip Generation ---
            artisan = get_object_or_404(Artisan, pk=artisan_id)
            job_items_query = base_query.filter(artisan=artisan)
            
            job_items = list(job_items_query)

            if not job_items:
                return Response({"detail": "No eligible job items found for this artisan in the specified period."},
                                status=status.HTTP_404_NOT_FOUND)

            # Calculate initial total payment
            initial_total_payment = sum(item.final_payment for item in job_items)

            with transaction.atomic():
                # Create the payslip instance FIRST
                payslip = Payslip.objects.create(
                    artisan=artisan,
                    service_category=job_items[0].job.service_category if len(set(i.job.service_category for i in job_items)) == 1 else None,
                    total_payment=initial_total_payment, # Temporarily set to gross, will be updated
                    total_advances_deducted=Decimal('0.00'), # Initialize
                    period_start=period_start,
                    period_end=period_end,
                )

                # Now, deduct advances and link them to the created payslip
                remaining_payment, total_deducted_amount = _deduct_advances(artisan, initial_total_payment, payslip_instance=payslip)

                # Update the payslip with the final amounts
                payslip.total_payment = remaining_payment
                payslip.total_advances_deducted = total_deducted_amount
                
                # Generate single payslip spreadsheet
                spreadsheet_content, _ = generate_payslip_spreadsheet(artisan, job_items, period_start, period_end, service_category, total_deducted_amount)

                spreadsheet_filename = f"payslips/{artisan.name.replace(' ', '_')}_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}_{payslip.pk}.xlsx"
                payslip.spreadsheet_file.save(spreadsheet_filename, ContentFile(spreadsheet_content), save=True) 

                job_item_ids = [item.id for item in job_items]
                JobItem.objects.filter(id__in=job_item_ids).update(payslip_generated=True)

            response_serializer = PayslipListSerializer(payslip, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        elif service_category:
            # --- Bulk Payslip Generation ---
            job_items_query = base_query.filter(job__service_category=service_category)
            
            all_job_items = list(job_items_query)

            if not all_job_items:
                return Response({"detail": f"No eligible job items found for service category '{service_category}' in the specified period."},
                                status=status.HTTP_404_NOT_FOUND)

            # Group job items by artisan
            from collections import defaultdict
            artisan_job_items = defaultdict(list)
            for item in all_job_items:
                artisan_job_items[item.artisan].append(item)

            generated_payslips = []
            with transaction.atomic():
                for artisan, items in artisan_job_items.items():
                    initial_total_payment = sum(item.final_payment for item in items)

                    # Create the payslip instance FIRST
                    payslip = Payslip.objects.create(
                        artisan=artisan,
                        service_category=service_category,
                        total_payment=initial_total_payment, # Temp
                        total_advances_deducted=Decimal('0.00'), # Init
                        period_start=period_start,
                        period_end=period_end,
                    )

                    # Deduct advances and link to the payslip
                    remaining_payment, total_deducted_amount = _deduct_advances(artisan, initial_total_payment, payslip_instance=payslip)

                    # Update payslip with final amounts
                    payslip.total_payment = remaining_payment
                    payslip.total_advances_deducted = total_deducted_amount

                    spreadsheet_filename = f"payslips/{artisan.name.replace(' ', '_')}_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}_{payslip.pk}.xlsx"
                    payslip.spreadsheet_file.save(spreadsheet_filename, ContentFile(spreadsheet_content), save=True)
                    
                    job_item_ids = [item.id for item in items]
                    JobItem.objects.filter(id__in=job_item_ids).update(payslip_generated=True)
                    
                    generated_payslips.append(payslip)

            response_serializer = PayslipListSerializer(generated_payslips, many=True, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response({"detail": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['get'])
    def metadata(self, request):
        """
        GET /api/payslips/metadata/
        Provides metadata for payslip-related operations.
        """
        from products.models import ServiceCategory
        metadata = {
            "service_categories": [
                {"value": sc.name, "label": sc.display_name} for sc in ServiceCategory.objects.all()
            ],
            "filterable_fields": [
                "artisan", "service_category", "period_start_gte", "period_end_lte",
                "generated_date_gte", "generated_date_lte", "artisan_name"
            ],
            "sortable_fields": self.ordering_fields,
            "search_fields": self.search_fields,
            "date_format": "YYYY-MM-DD",
            "spreadsheet_upload_formats": ["base64-encoded-xlsx", "multipart-form-data-xlsx"]
        }
        return Response(metadata, status=status.HTTP_200_OK)


class ServiceRateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ServiceRate resources.
    """
    queryset = ServiceRate.objects.all().select_related('product__product_type', 'product__size_category', 'service_category')
    serializer_class = ServiceRateSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product__product_type__name', 'product__animal_type', 'service_category__name']
    ordering_fields = ['product__product_type__name', 'product__animal_type', 'service_category__name', 'rate_per_unit']
    pagination_class = PayslipPagination

class ArtisanAdvanceViewSet(viewsets.ModelViewSet):
    queryset = ArtisanAdvance.objects.all().select_related('artisan')
    serializer_class = ArtisanAdvanceSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['artisan', 'is_settled']
    ordering_fields = ['date_given', 'amount', 'balance']
    ordering = ['-date_given']

    @action(detail=True, methods=['post'])
    def deduct(self, request, pk=None):
        """
        POST /api/financials/advances/{id}/deduct/
        Deduct an amount from an artisan's outstanding advance.
        """
        advance = self.get_object()
        amount_to_deduct = request.data.get('amount')
        payslip_id = request.data.get('payslip_id')

        if not amount_to_deduct:
            return Response({"detail": "Amount to deduct is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_to_deduct = Decimal(str(amount_to_deduct))
        except InvalidOperation:
            return Response({"detail": "Invalid amount format."}, status=status.HTTP_400_BAD_REQUEST)

        if amount_to_deduct <= 0:
            return Response({"detail": "Amount to deduct must be positive."}, status=status.HTTP_400_BAD_REQUEST)

        if amount_to_deduct > advance.balance:
            return Response({"detail": f"Amount to deduct ({amount_to_deduct}) exceeds outstanding balance ({advance.balance})."}, status=status.HTTP_400_BAD_REQUEST)

        payslip_instance = None
        if payslip_id:
            try:
                payslip_instance = Payslip.objects.get(pk=payslip_id)
            except Payslip.DoesNotExist:
                return Response({"detail": "Payslip not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Manually perform deduction logic here, similar to _deduct_advances but for a specific advance
            deductible_from_advance = min(amount_to_deduct, advance.balance)
            
            advance.balance -= deductible_from_advance
            if advance.balance <= 0:
                advance.is_settled = True
            advance.save()

            AdvanceDeduction.objects.create(
                advance=advance,
                payslip=payslip_instance,
                amount=deductible_from_advance
            )
        
        serializer = self.get_serializer(advance)
        return Response(serializer.data)

class AdvanceDeductionViewSet(viewsets.ModelViewSet):
    queryset = AdvanceDeduction.objects.all()
    serializer_class = AdvanceDeductionSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['advance', 'payslip']
    ordering_fields = ['date_deducted', 'amount']
    ordering = ['-date_deducted']