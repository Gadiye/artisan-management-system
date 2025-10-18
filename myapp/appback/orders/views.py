# orders/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny

from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import Order, OrderItem
from .serializers import (
    OrderListSerializer, OrderDetailSerializer, OrderCreateSerializer,
    OrderUpdateSerializer, OrderItemSerializer, OrderStatusUpdateSerializer
)
from inventory.models import FinishedStock

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('customer').prefetch_related('items__product')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    permission_classes = [AllowAny] # Adjust as per your auth needs

    # Filtering
    filterset_fields = {
        'status': ['exact', 'in'],
        'customer': ['exact'],
        'created_date': ['gte', 'lte', 'exact', 'range'], # For date range filtering
    }

    # Searching
    search_fields = ['customer__name', 'customer__email', 'notes']

    # Ordering
    ordering_fields = ['order_id', 'created_date', 'total_amount', 'status']
    ordering = ['-created_date'] # Default ordering

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'retrieve':
            # Optionally include items based on query param
            if self.request.query_params.get('include_items', 'false').lower() == 'true':
                return OrderDetailSerializer
            return OrderListSerializer # Use list serializer for less data by default
        elif self.action == 'create':
            return OrderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrderUpdateSerializer
        return OrderListSerializer # Default

    def perform_destroy(self, instance):
        # Allow deletion only if the order's status is PENDING or CANCELLED
        if instance.status not in ['PENDING', 'CANCELLED']:
            return Response(
                {"detail": "Order can only be deleted if its status is PENDING or CANCELLED."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # If order was cancelled and stock was restored, no further action needed here.
        # If it's PENDING, no stock was ever deducted.
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """
        Retrieve a list of order items associated with the order.
        GET /api/orders/{order_id}/items/
        """
        order = self.get_object()
        queryset = order.items.all().select_related('product')

        # Filtering for items
        product_id = request.query_params.get('product_id', None)
        if product_id is not None:
            queryset = queryset.filter(product__id=product_id)

        # Ordering for items
        ordering = request.query_params.get('ordering', None)
        if ordering:
            queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = OrderItemSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = OrderItemSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_order_status(self, request, pk=None):
        """
        Update the order's status explicitly.
        POST /api/orders/{order_id}/update-status/
        """
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        if new_status == order.status:
            return Response({"detail": "Status is already set to this value."}, status=status.HTTP_200_OK)

        original_status = order.status

        with transaction.atomic():
            # Logic for stock adjustment based on status change
            if new_status in ['PROCESSING', 'SHIPPED', 'DELIVERED'] and original_status not in ['PROCESSING', 'SHIPPED', 'DELIVERED']:
                # Transitioning to a stock-deducting status
                for item in order.items.all():
                    try:
                        finished_stock = FinishedStock.objects.get(product=item.product)
                        if finished_stock.quantity < item.quantity:
                            transaction.set_rollback(True) # Force rollback
                            return Response(
                                {"detail": f"Insufficient stock for {item.product.name} ({item.quantity} needed, {finished_stock.quantity} available). Status update blocked."},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                        finished_stock.quantity -= item.quantity
                        finished_stock.save()
                    except FinishedStock.DoesNotExist:
                        transaction.set_rollback(True) # Force rollback
                        return Response(
                            {"detail": f"Stock information not found for product: {item.product.name}. Status update blocked."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

            elif new_status == 'CANCELLED' and original_status not in ['PENDING', 'CANCELLED']:
                # Transitioning to CANCELLED from a status where stock was deducted
                for item in order.items.all():
                    try:
                        finished_stock = FinishedStock.objects.get(product=item.product)
                        finished_stock.quantity += item.quantity # Restore stock
                        finished_stock.save()
                    except FinishedStock.DoesNotExist:
                        # Log this, but don't block if stock model somehow disappeared after initial deduction
                        print(f"Warning: Stock not found for {item.product.name} during cancellation of Order {order.order_id}")

            order.status = new_status
            order.save()
            order.update_total_amount() # In case logic caused item changes implicitly (though not direct here)

        return Response(OrderListSerializer(order).data, status=status.HTTP_200_OK)


class OrderMetadataView(APIView):
    """
    Provides metadata about the Order model, such as status choices.
    """
    permission_classes = [IsAuthenticatedOrReadOnly] # Allow anyone to see metadata

    def get(self, request, *args, **kwargs):
        status_choices = [{"value": choice[0], "label": choice[1]} for choice in Order.STATUS_CHOICES]
        metadata = {
            "status_choices": status_choices,
            "filterable_fields": ["status", "customer", "created_date"],
            "sortable_fields": ["order_id", "created_date", "total_amount", "status"],
            "search_fields": ["customer__name", "customer__email", "notes"],
        }
        return Response(metadata, status=status.HTTP_200_OK)