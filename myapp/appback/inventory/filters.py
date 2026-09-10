import django_filters
from django_filters import rest_framework as filters
from rest_framework import permissions
from django.db.models import Q
from .models import Inventory
from products.models import Product




class InventoryFilter(filters.FilterSet):
    """
    Filter class for Inventory model with advanced filtering options.
    """
    service_category = filters.CharFilter(
        field_name='service_category__name',
        lookup_expr='iexact',
        help_text="Filter by service category"
    )
    
    product = filters.ModelChoiceFilter(
        queryset=Product.objects.all(),
        field_name='product',
        help_text="Filter by specific product"
    )
    
    product_type = filters.CharFilter(
        field_name='product__product_type__name',
        lookup_expr='iexact',
        help_text="Filter by product type"
    )
    
    animal_type = filters.CharFilter(
        field_name='product__animal_type',
        lookup_expr='icontains',
        help_text="Filter by animal type (case-insensitive partial match)"
    )
    
    size_category = filters.CharFilter(
        field_name='product__size_category__name',
        lookup_expr='iexact',
        help_text="Filter by size category"
    )
    
    quantity = filters.NumberFilter(
        field_name='quantity',
        help_text="Filter by exact quantity"
    )
    
    quantity__gt = filters.NumberFilter(
        field_name='quantity',
        lookup_expr='gt',
        help_text="Filter by quantity greater than"
    )
    
    quantity__lt = filters.NumberFilter(
        field_name='quantity',
        lookup_expr='lt',
        help_text="Filter by quantity less than"
    )
    
    quantity__gte = filters.NumberFilter(
        field_name='quantity',
        lookup_expr='gte',
        help_text="Filter by quantity greater than or equal to"
    )
    
    quantity__lte = filters.NumberFilter(
        field_name='quantity',
        lookup_expr='lte',
        help_text="Filter by quantity less than or equal to"
    )
    
    average_cost = filters.NumberFilter(
        field_name='average_cost',
        help_text="Filter by exact average cost"
    )
    
    average_cost__gt = filters.NumberFilter(
        field_name='average_cost',
        lookup_expr='gt',
        help_text="Filter by average cost greater than"
    )
    
    average_cost__lt = filters.NumberFilter(
        field_name='average_cost',
        lookup_expr='lt',
        help_text="Filter by average cost less than"
    )
    
    last_updated = filters.DateFilter(
        field_name='last_updated',
        help_text="Filter by last updated date (YYYY-MM-DD)"
    )
    
    last_updated__gte = filters.DateFilter(
        field_name='last_updated',
        lookup_expr='gte',
        help_text="Filter by last updated date greater than or equal to"
    )
    
    last_updated__lte = filters.DateFilter(
        field_name='last_updated',
        lookup_expr='lte',
        help_text="Filter by last updated date less than or equal to"
    )
    
    # Custom filters for more complex queries
    low_stock = filters.BooleanFilter(
        method='filter_low_stock',
        help_text="Filter items with low stock (quantity <= 10)"
    )
    
    zero_stock = filters.BooleanFilter(
        method='filter_zero_stock',
        help_text="Filter items with zero stock"
    )
    
    has_stock = filters.BooleanFilter(
        method='filter_has_stock',
        help_text="Filter items with stock > 0"
    )
    
    class Meta:
        model = Inventory
        fields = [
            'service_category', 'product', 'product_type', 'animal_type', 
            'size_category', 'quantity', 'average_cost', 'last_updated'
        ]
    
    def filter_low_stock(self, queryset, name, value):
        """
        Filter items with low stock (quantity <= 10).
        """
        if value:
            return queryset.filter(quantity__lte=10)
        return queryset
    
    def filter_zero_stock(self, queryset, name, value):
        """
        Filter items with zero stock.
        """
        if value:
            return queryset.filter(quantity=0)
        return queryset
    
    def filter_has_stock(self, queryset, name, value):
        """
        Filter items with stock > 0.
        """
        if value:
            return queryset.filter(quantity__gt=0)
        return queryset


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners or admins to edit inventory.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner or admin
        return request.user.is_staff or request.user.is_superuser


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admins to create/edit inventory.
    """
    
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to admin users
        return request.user.is_staff or request.user.is_superuser


class InventoryPermission(permissions.BasePermission):
    """
    Custom permission class for inventory operations with role-based access.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Allow all authenticated users to read
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, check user role
        if hasattr(request.user, 'role'):
            # Allow admins and managers full access
            if request.user.role in ['ADMIN', 'MANAGER']:
                return True
            
            # Artisans can only view inventory related to their service categories
            if request.user.role == 'ARTISAN':
                return request.method in permissions.SAFE_METHODS
        
        # Default: allow staff and superusers
        return request.user.is_staff or request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions based on user role
        if hasattr(request.user, 'role'):
            if request.user.role in ['ADMIN', 'MANAGER']:
                return True
            
            # Artisans cannot modify inventory
            if request.user.role == 'ARTISAN':
                return False
        
        # Default: allow staff and superusers
        return request.user.is_staff or request.user.is_superuser


class ServiceCategoryPermission(permissions.BasePermission):
    """
    Permission class that restricts access based on service categories.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # If user has a service_category attribute, restrict access
        if hasattr(request.user, 'service_category'):
            # User can only modify inventory for their service category
            return obj.service_category == request.user.service_category
        
        # Default: allow staff and superusers
        return request.user.is_staff or request.user.is_superuser


# Additional utility functions for filtering
class InventoryFilterHelper:
    """
    Helper class for common inventory filtering operations.
    """
    
    @staticmethod
    def filter_by_stock_level(queryset, level='all'):
        """
        Filter inventory by stock level.
        
        Args:
            queryset: Inventory queryset
            level: 'all', 'in_stock', 'low_stock', 'out_of_stock'
        """
        if level == 'in_stock':
            return queryset.filter(quantity__gt=0)
        elif level == 'low_stock':
            return queryset.filter(quantity__lte=10, quantity__gt=0)
        elif level == 'out_of_stock':
            return queryset.filter(quantity=0)
        return queryset
    
    @staticmethod
    def filter_by_cost_range(queryset, min_cost=None, max_cost=None):
        """
        Filter inventory by cost range.
        """
        if min_cost is not None:
            queryset = queryset.filter(average_cost__gte=min_cost)
        if max_cost is not None:
            queryset = queryset.filter(average_cost__lte=max_cost)
        return queryset
    
    @staticmethod
    def filter_by_date_range(queryset, start_date=None, end_date=None):
        """
        Filter inventory by last updated date range.
        """
        if start_date:
            queryset = queryset.filter(last_updated__gte=start_date)
        if end_date:
            queryset = queryset.filter(last_updated__lte=end_date)
        return queryset
    
    @staticmethod
    def exclude_finished_products(queryset):
        """
        Exclude FINISHED service category from queryset.
        """
        return queryset.exclude(service_category__name='FINISHED')