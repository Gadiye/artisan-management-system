from django.contrib import admin
from .models import Order, OrderItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'customer', 'status', 'created_date', 'total_amount')
    list_select_related = ('customer',)
    list_filter = ('status', 'created_date')
    search_fields = ('order_id', 'customer__name')

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'quantity', 'unit_price')
    list_select_related = ('order', 'product__product_type', 'product__size_category')
    search_fields = ('order__order_id', 'product__product_type__name', 'product__animal_type')

