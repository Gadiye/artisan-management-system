# products/views.py
from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from datetime import datetime
from rest_framework.decorators import api_view
from .models import Product, PriceHistory

from .models import Product, PriceHistory
 # Import choices directly
from .serializers import (
    ProductSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    PriceHistoryListSerializer,
    PriceHistoryCreateUpdateSerializer,
    ProductLiteSerializer # Used by PriceHistoryListSerializer
)
from .filters import ProductFilter, PriceHistoryFilter # Import both filters
from jobs.models import JobTransaction
from jobs.serializers import JobTransactionSerializer



class ProductPagination(PageNumberPagination):
    page_size = 300
    page_size_query_param = 'limit'
    max_page_size = 500


class PriceHistoryPagination(PageNumberPagination):
    """Custom pagination for price history lists."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations with additional functionality.

    Provides:
    - List products with filtering, searching, and sorting
    - Retrieve individual product details
    - Create new products
    - Update existing products (with price history tracking)
    - Soft delete products
    - Get price history for a product (nested)
    """

    queryset = Product.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['animal_type', 'product_type']
    ordering_fields = ['base_price', 'last_price_update', 'product_type', 'created_at']
    ordering = ['-last_price_update']
    pagination_class = ProductPagination


    def get_permissions(self):
        """
        Set permissions based on action for ProductViewSet.
        GET operations are read-only for all.
        POST, PUT, PATCH, DELETE are restricted to IsAdminUser.
        """
        if self.action in ['list', 'retrieve', 'get_product_price_history', 'product_metadata', 'missing_service_rates', 'transactions']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else: # create, update, partial_update, destroy
            permission_classes = [IsAuthenticated, IsAdminUser]
        return [permission() for permission in permission_classes]


    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return ProductDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductSerializer

    def get_queryset(self):
        """Filter queryset to show only active products by default."""
        queryset = Product.objects.all()

        if self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)

        return queryset


    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new product. If a base_price is provided, also log initial price history.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.save()

        if product.base_price is not None:
            PriceHistory.objects.create(
                product=product,
                old_price=0.00,
                new_price=product.base_price,
                effective_date=timezone.now(),
                changed_by=request.user.username if request.user.is_authenticated else 'system',
                reason="Initial product price setting"
            )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update product and create price history record if price changes.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_price = instance.base_price

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        new_price = serializer.validated_data.get('base_price')

        if new_price is not None and new_price != old_price:
            PriceHistory.objects.create(
                product=instance,
                old_price=old_price,
                new_price=new_price,
                effective_date=timezone.now(),
                changed_by=request.user.username if request.user.is_authenticated else 'system',
                reason=request.data.get('reason', 'Product base price update')
            )

        self.perform_update(serializer)

        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete product by setting is_active=False.
        Only allows hard deletion if explicitly requested and no dependencies exist.
        """
        instance = self.get_object()

        has_job_items = hasattr(instance, 'jobitem_set') and instance.jobitem_set.exists()
        has_dependencies = has_job_items

        force_delete = request.query_params.get('force_delete', '').lower() == 'true'

        if has_dependencies and force_delete:
            return Response(
                {'error': 'Cannot hard delete product with existing dependencies. Consider soft deletion.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif has_dependencies and not force_delete:
            instance.is_active = False
            instance.save()
            return Response(
                {'message': 'Product deactivated successfully (soft deleted).'},
                status=status.HTTP_200_OK
            )
        elif not has_dependencies and force_delete:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            instance.is_active = False
            instance.save()
            return Response(
                {'message': 'Product deactivated successfully (soft deleted).'},
                status=status.HTTP_200_OK
            )


    @action(detail=True, methods=['get'], url_path='price-history')
    def get_product_price_history(self, request, pk=None):
        """
        GET /api/products/{product_id}/price-history/
        Retrieve price history records for a specific product.
        This action uses the dedicated PriceHistoryListSerializer.
        """
        product = self.get_object()
        queryset = PriceHistory.objects.filter(product=product).order_by('-effective_date')

        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(effective_date__date__gte=start_date)
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(effective_date__date__lte=end_date)
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PriceHistoryListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = PriceHistoryListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='metadata')
    def product_metadata(self, request):
        """
        GET /api/products/metadata/
        Provide metadata for product choices to populate frontend dropdowns.
        """
        data = {
    'product_types': [
        {'value': choice[0], 'label': choice[1]}
        for choice in Product.PRODUCT_TYPES
    ],
    'size_categories': [
        {'value': choice[0], 'label': choice[1]}
        for choice in Product.SIZE_CATEGORIES
    ]
}

        return Response(data)

    @action(detail=False, methods=['get'], url_path='missing-service-rates')
    def missing_service_rates(self, request):
        """
        GET /api/products/missing-service-rates/
        Returns a list of products that do not have any service rates defined.
        """
        # Get all product IDs that have at least one service rate
        products_with_rates_ids = ServiceRate.objects.values_list('product_id', flat=True).distinct()

        # Get all active products that are not in the list of products with rates
        products_without_rates = Product.objects.filter(is_active=True).exclude(id__in=products_with_rates_ids)

        page = self.paginate_queryset(products_without_rates)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products_without_rates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='transactions')
    def transactions(self, request, pk=None):
        """
        GET /api/products/{product_id}/transactions/
        Retrieve transaction history for a specific product.
        """
        product = self.get_object()
        queryset = JobTransaction.objects.filter(product=product).order_by('-timestamp')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = JobTransactionSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = JobTransactionSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class PriceHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing PriceHistory records.
    Provides read-only access for most users, with create/update/delete restricted to admins.
    Supports filtering, searching, and sorting.
    """
    queryset = PriceHistory.objects.all().select_related('product')
    pagination_class = PriceHistoryPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PriceHistoryFilter
    search_fields = [
        'product__animal_type', 'product__product_type', 'reason', 'changed_by'
    ]
    ordering_fields = ['effective_date', 'new_price', 'old_price', 'product__product_type', 'product__animal_type']
    ordering = ['-effective_date'] # Default sorting

    def get_permissions(self):
        """
        Set permissions based on action for PriceHistoryViewSet.
        GET operations are read-only for authenticated users.
        POST, PUT, PATCH, DELETE are restricted to IsAdminUser.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else: # create, update, partial_update, destroy
            permission_classes = [IsAuthenticated, IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return PriceHistoryListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PriceHistoryCreateUpdateSerializer
        return PriceHistoryListSerializer


    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new PriceHistory record.
        Optionally updates the related Product's base_price and last_price_update.
        """
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        new_price = serializer.validated_data['new_price']
        effective_date = serializer.validated_data.get('effective_date', timezone.now())

        # If old_price is not provided, try to get it from the product's current base_price
        if 'old_price' not in serializer.validated_data:
            serializer.validated_data['old_price'] = product.base_price

        price_history = serializer.save()

        # Update Product's base_price if this new history record is the most recent
        latest_history = PriceHistory.objects.filter(product=product).order_by('-effective_date').first()
        if latest_history and latest_history.pk == price_history.pk:
            if product.base_price != new_price:
                product.base_price = new_price
                product.last_price_update = effective_date
                product.save(update_fields=['base_price', 'last_price_update'])

        return Response(PriceHistoryListSerializer(price_history, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update an existing PriceHistory record.
        Restricted to admins.
        Optionally updates the related Product's base_price if this is the latest record.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)

        updated_price_history = serializer.save()

        product = updated_price_history.product
        new_record_new_price = updated_price_history.new_price
        new_record_effective_date = updated_price_history.effective_date

        latest_history = PriceHistory.objects.filter(product=product).order_by('-effective_date').first()

        if latest_history and latest_history.pk == updated_price_history.pk:
            if product.base_price != new_record_new_price:
                product.base_price = new_record_new_price
                product.last_price_update = new_record_effective_date
                product.save(update_fields=['base_price', 'last_price_update'])
        elif latest_history:
            if product.base_price != latest_history.new_price:
                 product.base_price = latest_history.new_price
                 product.last_price_update = latest_history.effective_date
                 product.save(update_fields=['base_price', 'last_price_update'])

        return Response(PriceHistoryListSerializer(updated_price_history, context={'request': request}).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """
        Delete a PriceHistory record.
        Restricted to admins.
        Prevents deletion if it's the latest record influencing the Product's current price,
        unless there's another record to fall back on.
        """
        instance = self.get_object()
        product = instance.product

        latest_history = PriceHistory.objects.filter(product=product).order_by('-effective_date').first()

        if latest_history and latest_history.pk == instance.pk:
            second_latest_history = PriceHistory.objects.filter(product=product).exclude(pk=instance.pk).order_by('-effective_date').first()

            if second_latest_history:
                product.base_price = second_latest_history.new_price
                product.last_price_update = second_latest_history.effective_date
                product.save(update_fields=['base_price', 'last_price_update'])
            else:
                return Response(
                    {"detail": "Cannot delete the only price history record for this product without manual price adjustment."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


    @action(detail=False, methods=['get'])
    def metadata(self, request):
        """
        GET /api/price-history/metadata/
        Provides metadata about filterable and sortable fields for PriceHistory.
        """
        metadata = {
            "filterable_fields": [
                "product", "effective_date_gte", "effective_date_lte",
                "changed_by", "product_animal_type", "product_product_type", "reason"
            ],
            "sortable_fields": self.ordering_fields,
            "search_fields": self.search_fields,
            "date_format": "YYYY-MM-DD",
        }
        return Response(metadata, status=status.HTTP_200_OK)
    
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Product
from jobs.models import ServiceRate # Import ServiceRate
from django.core.exceptions import ObjectDoesNotExist # Import ObjectDoesNotExist

@api_view(['GET'])
def get_price(request):
    """
    GET /api/products/get_price/?product_type=...&animal_type=...&size_category=...&service_category=...
    Returns the base price for a matching product and its service rate for the given service category.
    """
    product_type = request.GET.get("product_type")
    animal_type = request.GET.get("animal_type")
    size_category = request.GET.get("size_category")
    service_category = request.GET.get("service_category") # Get service_category from request

    if not all([product_type, animal_type, size_category, service_category]): # service_category is now required
        return Response({"error": "Missing required parameters."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(
            product_type__iexact=product_type,
            animal_type__iexact=animal_type,
            size_category__iexact=size_category,
            is_active=True
        )
        
        service_rate_per_unit = None
        try:
            service_rate = ServiceRate.objects.get(product=product, service_category=service_category)
            service_rate_per_unit = service_rate.rate_per_unit
        except ObjectDoesNotExist:
            # If no specific service rate is found, service_rate_per_unit remains None
            pass

        return Response({
            "id": product.id,
            "price": product.base_price,
            "service_rate_per_unit": service_rate_per_unit,
            "unit_of_measure": product.unit_of_measure # Add this line
        }, status=status.HTTP_200_OK)
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
