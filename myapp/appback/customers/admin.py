from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'is_active', 'created_date')
    search_fields = ('name', 'email', 'phone')
    list_filter = ('is_active', 'created_date')