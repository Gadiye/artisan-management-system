from django.contrib import admin
from .models import Product, PriceHistory, ProductType, SizeCategory, ServiceCategory

@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'display_name')
    search_fields = ('name', 'display_name')
    ordering = ('name',)

@admin.register(SizeCategory)
class SizeCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'display_name')
    search_fields = ('name', 'display_name')
    ordering = ('name',)

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'display_name')
    search_fields = ('name', 'display_name')
    ordering = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'product_type', 'animal_type', 'size_category', 'base_price', 'unit_of_measure', 'is_active')
    list_filter = ('product_type', 'animal_type', 'size_category', 'unit_of_measure', 'is_active')
    search_fields = ('product_type__name', 'product_type__display_name', 'animal_type', 'size_category__name', 'size_category__display_name')
    autocomplete_fields = ('product_type', 'size_category')
    list_editable = ('base_price', 'is_active')
    ordering = ('id',)

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'old_price', 'new_price', 'effective_date', 'changed_by')
    list_filter = ('effective_date', 'changed_by')
    search_fields = ('product__product_type__name', 'product__product_type__display_name', 'product__animal_type', 'changed_by')
    readonly_fields = ('effective_date',)