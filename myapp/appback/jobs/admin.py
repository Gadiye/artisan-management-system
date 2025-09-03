from django.contrib import admin
from .models import Job, JobItem, ServiceRate

@admin.register(ServiceRate)
class ServiceRateAdmin(admin.ModelAdmin):
    list_display = ('product', 'service_category', 'rate_per_unit')
    list_filter = ('service_category',)
    search_fields = ('product__product_type', 'product__animal_type')
    

admin.site.register(Job)
admin.site.register(JobItem)
