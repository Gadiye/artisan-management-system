from django.contrib import admin
from .models import Product, PriceHistory

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'product_type', 'animal_type', 'size_category', 'base_price', 'unit_of_measure', 'is_active')
    list_filter = ('product_type', 'animal_type', 'size_category', 'unit_of_measure', 'is_active')
    search_fields = ('product_type', 'animal_type', 'size_category')
    list_editable = ('base_price', 'is_active')
    ordering = ('id',)

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'old_price', 'new_price', 'effective_date', 'changed_by')
    list_filter = ('effective_date', 'changed_by')
    search_fields = ('product__product_type', 'product__animal_type', 'changed_by')
    readonly_fields = ('effective_date',)