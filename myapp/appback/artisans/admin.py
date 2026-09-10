from django.contrib import admin
from .models import Artisan

@admin.register(Artisan)
class ArtisanAdmin(admin.ModelAdmin):
    search_fields = ('name', 'phone')
    list_display = ('name', 'phone', 'is_active')
