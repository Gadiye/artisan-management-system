from django.contrib import admin
from .models import Inventory, FinishedStock

class InventoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'service_category', 'quantity', 'average_cost', 'last_updated')
    search_fields = ('product__product_type', 'product__animal_type')
    list_filter = ('service_category', 'product__product_type', 'product__animal_type')

class FinishedStockAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'average_cost', 'last_updated')
    search_fields = ('product__product_type', 'product__animal_type')
    list_filter = ('product__product_type', 'product__animal_type')

admin.site.register(Inventory, InventoryAdmin)
admin.site.register(FinishedStock, FinishedStockAdmin)