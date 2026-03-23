from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Inventory, FinishedStock
from jobs.models import JobDelivery
from orders.models import OrderItem
from .serializers import (
    InventorySerializer,
    InventoryDetailSerializer,
    InventoryCreateSerializer,
    InventoryUpdateSerializer,
    JobDeliverySerializer,
    FinishedStockSerializer,
)
from orders.serializers import OrderItemSerializer
from .filters import InventoryFilter
from .filters import IsAdminOrReadOnly
from rest_framework.pagination import PageNumberPagination
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 500

class FinishedStockViewSet(viewsets.ModelViewSet):
    queryset = FinishedStock.objects.all()
    serializer_class = FinishedStockSerializer
    permission_classes = [AllowAny]

    def list(self, request, *args, **kwargs):
        print("DEBUG: FinishedStockViewSet list method hit!")
        return super().list(request, *args, **kwargs)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['product__product_type', 'product__animal_type']
    search_fields = ['product__product_type', 'product__animal_type']
    ordering_fields = ['quantity', 'average_cost', 'last_updated']
    pagination_class = StandardResultsSetPagination

    def list(self, request, *args, **kwargs):
        print("FinishedStockViewSet list method called!")
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Ensure only one FinishedStock entry per product
        if FinishedStock.objects.filter(product=serializer.validated_data['product']).exists():
            raise ValidationError("FinishedStock entry for this product already exists.")
        serializer.save()

    def perform_update(self, serializer):
        # Prevent changing the product for an existing FinishedStock entry
        if 'product' in serializer.validated_data and serializer.instance.product != serializer.validated_data['product']:
            raise ValidationError("Cannot change product for an existing FinishedStock entry.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.quantity > 0:
            return Response(
                {'error': 'Cannot delete finished stock with non-zero quantity.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)



class UnifiedInventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.select_related('product').all()
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = InventoryFilter
    search_fields = ['product__animal_type', 'product__product_type']
    ordering_fields = ['quantity', 'average_cost', 'last_updated', 'product__product_type']
    ordering = ['-last_updated']
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InventoryDetailSerializer
        elif self.action == 'create':
            return InventoryCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InventoryUpdateSerializer
        return InventorySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        service_category = serializer.validated_data['service_category']

        if service_category == 'FINISHED':
            if Inventory.objects.filter(product=product, service_category='FINISHED').exists():
                raise ValidationError("FinishedStock record for this product already exists.")
        
        instance = serializer.save(last_updated=timezone.now())
        # Explicit synchronization instead of signals
        from .services import sync_finished_stock
        sync_finished_stock(instance)

    def perform_update(self, serializer):
        if 'product' in serializer.validated_data or 'service_category' in serializer.validated_data:
            raise ValidationError("Cannot update product or service_category. Delete and recreate the record.")
        
        instance = serializer.save(last_updated=timezone.now())
        # Explicit synchronization instead of signals
        from .services import sync_finished_stock
        sync_finished_stock(instance)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.quantity > 0:
            return Response(
                {'error': 'Cannot delete inventory with non-zero quantity.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Explicit synchronization instead of signals
        from .services import delete_inventory_and_sync
        delete_inventory_and_sync(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        inventory = self.get_object()

        deliveries = JobDelivery.objects.filter(
            job_item__product=inventory.product,
            job_item__service_category=inventory.service_category
        ).select_related('job_item__artisan').order_by('-delivery_date')

        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')
        if start:
            deliveries = deliveries.filter(delivery_date__gte=start)
        if end:
            deliveries = deliveries.filter(delivery_date__lte=end)

        page = self.paginate_queryset(deliveries)
        if page is not None:
            serializer = JobDeliverySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = JobDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def order_items(self, request, pk=None):
        inventory = self.get_object()

        order_items = OrderItem.objects.filter(
            product=inventory.product
        ).select_related('order').order_by('-order__created_date')

        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')
        status = request.query_params.get('order_status')
        if start:
            order_items = order_items.filter(order__created_date__gte=start)
        if end:
            order_items = order_items.filter(order__created_date__lte=end)
        if status:
            order_items = order_items.filter(order__status=status)

        page = self.paginate_queryset(order_items)
        if page is not None:
            serializer = OrderItemSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = OrderItemSerializer(order_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        group_by = request.query_params.get('group_by', 'service_category')

        if group_by == 'service_category':
            summary = Inventory.objects.values('service_category').annotate(
                total_quantity=Sum('quantity'),
                average_cost=Avg('average_cost'),
                record_count=Count('id')
            )
        elif group_by == 'product_type':
            summary = Inventory.objects.values('product__product_type').annotate(
                total_quantity=Sum('quantity'),
                average_cost=Avg('average_cost'),
                record_count=Count('id')
            )
        elif group_by == 'size_category':
            summary = Inventory.objects.values('product__size_category').annotate(
                total_quantity=Sum('quantity'),
                average_cost=Avg('average_cost'),
                record_count=Count('id')
            )
        else:
            return Response(
                {'error': "Invalid group_by parameter. Use 'service_category', 'product_type', or 'size_category'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'summary': list(summary)})

    @action(detail=False, methods=['get'])
    def metadata(self, request):
        service_categories = [
            {'value': sc[0], 'label': sc[1]}
            for sc in Inventory.SERVICE_CATEGORIES
        ]
        return Response({
            'filterable_fields': ['service_category', 'quantity', 'product', 'product__product_type', 'product__size_category'],
            'sortable_fields': ['quantity', 'average_cost', 'last_updated', 'product__product_type'],
            'search_fields': ['product__animal_type', 'product__product_type'],
            'service_categories': service_categories,
        })