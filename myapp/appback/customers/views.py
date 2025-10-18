from django.db.models import Q, Count, Sum, OuterRef, Subquery
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Customer
from .serializers import (
    CustomerSerializer, 
    CustomerWithOrdersSerializer, 
    CustomerStatsSerializer,
    CustomerBasicSerializer
)
from orders.models import Order
from orders.serializers import OrderListSerializer


class CustomerPagination(PageNumberPagination):
    """Custom pagination for customer lists"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200


class CustomerViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing customer instances.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]
    pagination_class = CustomerPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Fields for filtering
    filterset_fields = {
        'is_active': ['exact'],
        'created_date': ['gte', 'lte', 'exact'],
    }

    # Fields for searching
    search_fields = ['name', 'email', 'phone']

    # Fields for ordering
    ordering_fields = ['name', 'email', 'created_date', 'total_spent', 'total_orders', 'last_order_date']
    ordering = ['-created_date']

    def get_queryset(self):
        """
        Optionally annotates queryset with order stats for sorting and filtering,
        and handles 'is_active' filtering.
        """
        queryset = super().get_queryset()

        # Subquery to get the date of the last order
        last_order_subquery = Order.objects.filter(
            customer=OuterRef('pk')
        ).order_by('-created_date').values('created_date')[:1]

        # Annotate with computed fields for sorting
        queryset = queryset.annotate(
            total_orders=Count('order', distinct=True),
            total_spent=Sum('order__total_amount', filter=Q(order__status__in=['DELIVERED', 'SHIPPED'])),
            last_order_date=Subquery(last_order_subquery)
        )

        # Handle 'is_active' filtering
        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            is_active = is_active_param.lower() in ['true', '1']
            queryset = queryset.filter(is_active=is_active)
        else:
            # Default to only active customers if not specified
            queryset = queryset.filter(is_active=True)
            
        return queryset

    def get_serializer_class(self):
        """
        Return different serializers for list and detail views.
        """
        if self.action == 'retrieve':
            # Optionally include full order details
            if self.request.query_params.get('include_orders', 'false').lower() == 'true':
                return CustomerWithOrdersSerializer
        return CustomerSerializer

    def perform_destroy(self, instance):
        """
        Soft delete a customer by setting is_active=False.
        Prevents deletion if there are active orders.
        """
        active_orders = Order.objects.filter(
            customer=instance
        ).exclude(
            status__in=['CANCELLED', 'DELIVERED']
        ).exists()

        if active_orders:
            # Using Response instead of raising an exception for a clearer API response
            return Response(
                {'error': 'Cannot deactivate customer with active orders.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='orders')
    def customer_orders(self, request, pk=None):
        """
        Get all orders for a specific customer, with filtering and pagination.
        GET /api/customers/{id}/orders/
        """
        customer = self.get_object()
        queryset = Order.objects.filter(customer=customer)

        # Filtering by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtering by date range
        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(created_date__gte=start_date)
        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(created_date__lte=end_date)

        # Ordering
        ordering = request.query_params.get('ordering', '-created_date')
        queryset = queryset.order_by(ordering)

        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = OrderListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = OrderListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get aggregated statistics about customers.
        GET /api/customers/stats/
        """
        total_customers = Customer.objects.count()
        active_customers = Customer.objects.filter(is_active=True).count()
        
        # Revenue and order stats from delivered or shipped orders
        valid_orders = Order.objects.filter(status__in=['DELIVERED', 'SHIPPED'])
        total_revenue = valid_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        total_orders = valid_orders.count()
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

        # New customers this month
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0)
        new_customers_this_month = Customer.objects.filter(created_date__gte=current_month_start).count()

        stats_data = {
            'total_customers': total_customers,
            'active_customers': active_customers,
            'inactive_customers': total_customers - active_customers,
            'total_revenue': round(total_revenue, 2),
            'total_orders': total_orders,
            'avg_order_value': round(avg_order_value, 2),
            'new_customers_this_month': new_customers_this_month,
        }
        
        serializer = CustomerStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """
        Bulk update customers (e.g., activate/deactivate).
        POST /api/customers/bulk-update/
        """
        customer_ids = request.data.get('customer_ids', [])
        action_type = request.data.get('action')

        if not customer_ids or action_type not in ['activate', 'deactivate']:
            return Response(
                {'error': '`customer_ids` and a valid `action` (`activate` or `deactivate`) are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = Customer.objects.filter(id__in=customer_ids)
        
        if action_type == 'activate':
            updated_count = queryset.update(is_active=True)
        else: # 'deactivate'
            # Add logic to check for active orders before deactivating in bulk
            customers_with_active_orders = Customer.objects.filter(
                id__in=customer_ids, 
                order__status__in=['PENDING', 'PROCESSING']
            ).distinct()

            if customers_with_active_orders.exists():
                return Response(
                    {'error': f'Cannot deactivate customers with active orders. Problematic IDs: {[c.id for c in customers_with_active_orders]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            updated_count = queryset.update(is_active=False)

        return Response({
            'message': f'Successfully {action_type}d {updated_count} customers.',
            'updated_count': updated_count
        })

    @action(detail=False, methods=['get'], url_path='metadata')
    def metadata(self, request):
        """
        Get metadata for the customer module (e.g., choices, filterable fields).
        GET /api/customers/metadata/
        """
        metadata = {
            'status_choices': [{'value': True, 'label': 'Active'}, {'value': False, 'label': 'Inactive'}],
            'search_fields': self.search_fields,
            'filterable_fields': list(self.filterset_fields.keys()),
            'ordering_fields': self.ordering_fields,
        }
        return Response(metadata)
