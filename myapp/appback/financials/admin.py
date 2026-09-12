from django.contrib import admin

from .models import Payslip, ServiceRate, ArtisanAdvance

@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('id', 'artisan', 'service_category', 'total_payment', 'period_start', 'period_end', 'generated_date')
    list_select_related = ('artisan', 'service_category')
    list_filter = ('service_category', 'generated_date')
    search_fields = ('artisan__name',)
    autocomplete_fields = ('artisan', 'service_category')

@admin.register(ServiceRate)
class FinancialServiceRateAdmin(admin.ModelAdmin):
    list_display = ('product', 'service_category', 'rate_per_unit', 'is_active')
    list_select_related = ('product__product_type', 'product__size_category', 'service_category')
    list_filter = ('service_category', 'is_active')
    search_fields = ('product__product_type__name', 'product__animal_type')
    autocomplete_fields = ('product', 'service_category')

@admin.register(ArtisanAdvance)
class ArtisanAdvanceAdmin(admin.ModelAdmin):
    list_display = ('artisan', 'amount', 'balance', 'is_settled', 'date_given')
    list_select_related = ('artisan',)
    list_filter = ('is_settled', 'date_given')
    search_fields = ('artisan__name',)
    autocomplete_fields = ('artisan',)

