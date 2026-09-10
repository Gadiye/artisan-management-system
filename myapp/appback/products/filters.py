# products/filters.py
import django_filters
from .models import Product, PriceHistory


from django.db import models

class ProductFilter(django_filters.FilterSet):
    """
    FilterSet for Product model.
    """
    product_type = django_filters.CharFilter(method='filter_product_type', help_text='Filter by product type ID, code, or name.')
    size_category = django_filters.CharFilter(method='filter_size_category', help_text='Filter by size category ID, code, or name.')
    animal_type = django_filters.CharFilter(lookup_expr='icontains', help_text='Search by partial animal type.')
    is_active = django_filters.BooleanFilter(help_text='Filter by active status (true/false).')
    base_price_gte = django_filters.NumberFilter(field_name='base_price', lookup_expr='gte', help_text='Filter by base price greater than or equal to.')
    base_price_lte = django_filters.NumberFilter(field_name='base_price', lookup_expr='lte', help_text='Filter by base price less than or equal to.')

    def filter_product_type(self, queryset, name, value):
        if not value:
            return queryset
        if str(value).isdigit():
            return queryset.filter(models.Q(product_type__id=value) | models.Q(product_type__name=value))
        return queryset.filter(models.Q(product_type__name__iexact=value) | models.Q(product_type__display_name__icontains=value))

    def filter_size_category(self, queryset, name, value):
        if not value:
            return queryset
        if str(value).isdigit():
            return queryset.filter(models.Q(size_category__id=value) | models.Q(size_category__name=value))
        return queryset.filter(models.Q(size_category__name__iexact=value) | models.Q(size_category__display_name__icontains=value))

    class Meta:
        model = Product
        fields = [
            'product_type', 'size_category', 'animal_type',
            'is_active', 'base_price_gte', 'base_price_lte'
        ]


class PriceHistoryFilter(django_filters.FilterSet):
    """
    FilterSet for PriceHistory model.
    """
    product = django_filters.ModelChoiceFilter(
        queryset=Product.objects.all(),
        field_name='product',
        help_text='Filter by Product ID.'
    )
    effective_date_gte = django_filters.DateFilter(
        field_name='effective_date',
        lookup_expr='date__gte',
        help_text='Filter by records effective on or after this date (YYYY-MM-DD).'
    )
    effective_date_lte = django_filters.DateFilter(
        field_name='effective_date',
        lookup_expr='date__lte',
        help_text='Filter by records effective on or before this date (YYYY-MM-DD).'
    )
    changed_by = django_filters.CharFilter(
        field_name='changed_by',
        lookup_expr='icontains',
        help_text='Search by partial name of who changed the price.'
    )
    product_animal_type = django_filters.CharFilter(
        field_name='product__animal_type',
        lookup_expr='icontains',
        help_text='Search by partial animal type (e.g., "elephant").'
    )
    product_product_type = django_filters.CharFilter(
        field_name='product__product_type',
        lookup_expr='icontains',
        help_text='Search by partial product type (e.g., "sitting").'
    )
    reason = django_filters.CharFilter(
        field_name='reason',
        lookup_expr='icontains',
        help_text='Search by partial reason text.'
    )

    class Meta:
        model = PriceHistory
        fields = [
            'product', 'effective_date_gte', 'effective_date_lte',
            'changed_by', 'product_animal_type', 'product_product_type', 'reason'
        ]