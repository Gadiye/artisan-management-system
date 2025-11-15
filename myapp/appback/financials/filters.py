# financials/filters.py
import django_filters
from .models import Payslip
from artisans.models import Artisan


class PayslipFilter(django_filters.FilterSet):
    # Filter by Artisan ID
    artisan = django_filters.ModelChoiceFilter(
        queryset=Artisan.objects.all(),
        field_name='artisan',
        help_text='Filter by Artisan ID.'
    )
    # Filter by Service Category (exact match)
    service_category = django_filters.CharFilter(
        field_name='service_category',
        lookup_expr='exact',
        help_text='Filter by service category (e.g., CARVING).'
    )
    # Filter by period_start (inclusive greater than or equal to)
    period_start_gte = django_filters.DateFilter(
        field_name='period_start',
        lookup_expr='gte',
        help_text='Filter by payslips starting on or after this date (YYYY-MM-DD).'
    )
    # Filter by period_end (inclusive less than or equal to)
    period_end_lte = django_filters.DateFilter(
        field_name='period_end',
        lookup_expr='lte',
        help_text='Filter by payslips ending on or before this date (YYYY-MM-DD).'
    )
    # Filter by generated_date (inclusive greater than or equal to)
    generated_date_gte = django_filters.DateFilter(
        field_name='generated_date',
        lookup_expr='date__gte',
        help_text='Filter by payslips generated on or after this date (YYYY-MM-DD).'
    )
    # Filter by generated_date (inclusive less than or equal to)
    generated_date_lte = django_filters.DateFilter(
        field_name='generated_date',
        lookup_expr='date__lte',
        help_text='Filter by payslips generated on or before this date (YYYY-MM-DD).'
    )
    # Search by artisan name (case-insensitive contains)
    artisan_name = django_filters.CharFilter(
        field_name='artisan__name',
        lookup_expr='icontains',
        help_text='Search by partial artisan name (e.g., "john").'
    )

    class Meta:
        model = Payslip
        fields = [
            'artisan', 'service_category',
            'period_start_gte', 'period_end_lte',
            'generated_date_gte', 'generated_date_lte',
            'artisan_name'
        ]
