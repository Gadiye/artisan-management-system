# jobs/filters.py
import django_filters
from .models import Job, JobItem
from artisans.models import Artisan # Assuming Artisan app
from products.models import Product # Assuming Product app


class JobFilter(django_filters.FilterSet):
    created_date_gte = django_filters.DateFilter(field_name='created_date', lookup_expr='date__gte', help_text='Jobs created on or after (YYYY-MM-DD).')
    created_date_lte = django_filters.DateFilter(field_name='created_date', lookup_expr='date__lte', help_text='Jobs created on or before (YYYY-MM-DD).')
    status = django_filters.ChoiceFilter(field_name='_status', choices=Job.STATUS_CHOICES, help_text='Filter by job status.')
    service_category = django_filters.CharFilter(field_name='service_category__name', lookup_expr='iexact', help_text='Filter by service category.')
    created_by = django_filters.CharFilter(lookup_expr='icontains', help_text='Search by partial creator name.')

    class Meta:
        model = Job
        fields = [
            'created_date_gte', 'created_date_lte', 'status',
            'service_category', 'created_by'
        ]


class JobItemFilter(django_filters.FilterSet):
    artisan = django_filters.ModelChoiceFilter(
        queryset=Artisan.objects.all(),
        field_name='artisan',
        help_text='Filter by Artisan ID.'
    )
    product = django_filters.ModelChoiceFilter(
        queryset=Product.objects.all(),
        field_name='product',
        help_text='Filter by Product ID.'
    )
    payslip_generated = django_filters.BooleanFilter(help_text='Filter by payslip generation status (true/false).')
    job_id = django_filters.NumberFilter(field_name='job__job_id', help_text='Filter by parent Job ID.')
    created_date_gte = django_filters.DateFilter(field_name='job__created_date', lookup_expr='date__gte', help_text='Job created on or after (YYYY-MM-DD).')
    created_date_lte = django_filters.DateFilter(field_name='job__created_date', lookup_expr='date__lte', help_text='Job created on or before (YYYY-MM-DD).')

    service_category = django_filters.CharFilter(
        field_name='job__service_category__name',
        lookup_expr='iexact',
        help_text='Filter by service category.'
    )

    class Meta:
        model = JobItem
        fields = [
            'artisan', 'product', 'payslip_generated', 'job_id',
            'created_date_gte', 'created_date_lte', 'service_category'
        ]