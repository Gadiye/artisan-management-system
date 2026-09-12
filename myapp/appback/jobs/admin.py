from django.contrib import admin
from .models import Job, JobItem, ServiceRate

@admin.register(ServiceRate)
class ServiceRateAdmin(admin.ModelAdmin):
    list_display = ('product', 'service_category', 'rate_per_unit')
    list_select_related = ('product__product_type', 'product__size_category', 'service_category')
    list_filter = ('service_category',)
    search_fields = ('product__product_type__name', 'product__product_type__display_name', 'product__animal_type')

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('job_id', 'created_by', 'created_date', 'status', 'service_category')
    list_select_related = ('service_category',)
    list_filter = ('service_category', 'created_date')
    search_fields = ('job_id', 'created_by')
    readonly_fields = ('job_id',)

@admin.register(JobItem)
class JobItemAdmin(admin.ModelAdmin):
    list_display = ('job', 'artisan', 'product', 'quantity_ordered', 'quantity_received', 'quantity_accepted')
    list_select_related = ('job', 'artisan', 'product__product_type', 'product__size_category')
    list_filter = ('job__service_category', 'artisan')
    search_fields = ('job__job_id', 'artisan__name', 'product__product_type__name', 'product__product_type__display_name')
    
