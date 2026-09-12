from django.contrib import admin
from django import forms
from .models import Inventory, FinishedStock
from products.models import Product

class FinishedStockAdminForm(forms.ModelForm):
    pairs = forms.IntegerField(required=False, help_text="Number of pairs (for PAIRS products)")
    singles = forms.IntegerField(required=False, help_text="Number of single items (for PAIRS products)")

    class Meta:
        model = FinishedStock
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Only try to populate/show if an existing instance with a product is being edited
        if self.instance and self.instance.pk and self.instance.product:
            if self.instance.product.unit_of_measure == 'PAIRS':
                self.fields['pairs'].initial = self.instance.quantity // 2
                self.fields['singles'].initial = self.instance.quantity % 2
                self.fields['quantity'].widget = forms.HiddenInput()
            elif self.instance.product.unit_of_measure == 'ITEMS':
                # For ITEMS products, ensure original quantity is visible and pairs/singles are hidden
                self.fields['quantity'].widget = forms.NumberInput() # Or whatever default widget
                self.fields['pairs'].widget = forms.HiddenInput()
                self.fields['singles'].widget = forms.HiddenInput()

    def clean(self):
        cleaned_data = super().clean()
        product = cleaned_data.get('product')
        quantity = cleaned_data.get('quantity')
        pairs = cleaned_data.get('pairs')
        singles = cleaned_data.get('singles')

        if product and product.unit_of_measure == 'PAIRS':
            if pairs is None: pairs = 0
            if singles is None: singles = 0
            cleaned_data['quantity'] = (pairs * 2) + singles
        elif product and product.unit_of_measure == 'ITEMS':
            # Ensure pairs and singles are not set for ITEMS products
            if pairs is not None and pairs != 0:
                self.add_error('pairs', "Pairs input is not allowed for ITEMS products.")
            if singles is not None and singles != 0:
                self.add_error('singles', "Singles input is not allowed for ITEMS products.")
            # If quantity is not provided, use 0
            if quantity is None: cleaned_data['quantity'] = 0
        
        return cleaned_data


class FinishedStockAdmin(admin.ModelAdmin):
    form = FinishedStockAdminForm
    list_display = ('product', 'display_quantity', 'average_cost', 'last_updated')
    list_select_related = ('product__product_type', 'product__size_category')
    search_fields = ('product__product_type__name', 'product__product_type__display_name', 'product__animal_type')
    list_filter = ('product__product_type', 'product__animal_type')

    def get_fieldsets(self, request, obj=None):
        fieldsets = (
            (None, {'fields': ('product', 'average_cost', 'is_active')}),
            ('Quantity', {
                'fields': ('quantity', 'pairs', 'singles'),
                'description': "For PAIRS products, enter quantity in pairs and singles. For ITEMS products, enter total items in Quantity field."
            }),
            ('Audit Info', {'fields': ('last_audit_date',), 'classes': ('collapse',)}),
        )
        return fieldsets

    def display_quantity(self, obj):
        if obj.product.unit_of_measure == 'PAIRS':
            pairs = obj.quantity // 2
            singles = obj.quantity % 2
            return f"{pairs} pairs, {singles} singles ({obj.quantity} items)"
        return f"{obj.quantity} items"
    display_quantity.short_description = "Quantity"


class InventoryAdminForm(forms.ModelForm):
    pairs = forms.IntegerField(required=False, help_text="Number of pairs (for PAIRS products)")
    singles = forms.IntegerField(required=False, help_text="Number of single items (for PAIRS products)")

    class Meta:
        model = Inventory
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Only try to populate/show if an existing instance with a product is being edited
        if self.instance and self.instance.pk and self.instance.product:
            if self.instance.product.unit_of_measure == 'PAIRS':
                self.fields['pairs'].initial = self.instance.quantity // 2
                self.fields['singles'].initial = self.instance.quantity % 2
                self.fields['quantity'].widget = forms.HiddenInput()
            elif self.instance.product.unit_of_measure == 'ITEMS':
                # For ITEMS products, ensure original quantity is visible and pairs/singles are hidden
                self.fields['quantity'].widget = forms.NumberInput() # Or whatever default widget
                self.fields['pairs'].widget = forms.HiddenInput()
                self.fields['singles'].widget = forms.HiddenInput()

    def clean(self):
        cleaned_data = super().clean()
        product = cleaned_data.get('product')
        quantity = cleaned_data.get('quantity')
        pairs = cleaned_data.get('pairs')
        singles = cleaned_data.get('singles')

        if product and product.unit_of_measure == 'PAIRS':
            if pairs is None: pairs = 0
            if singles is None: singles = 0
            cleaned_data['quantity'] = (pairs * 2) + singles
        elif product and product.unit_of_measure == 'ITEMS':
            if pairs is not None and pairs != 0:
                self.add_error('pairs', "Pairs input is not allowed for ITEMS products.")
            if singles is not None and singles != 0:
                self.add_error('singles', "Singles input is not allowed for ITEMS products.")
            if quantity is None: cleaned_data['quantity'] = 0

        return cleaned_data


class InventoryAdmin(admin.ModelAdmin):
    form = InventoryAdminForm
    list_display = ('product', 'service_category', 'display_quantity', 'average_cost', 'last_updated')
    list_select_related = ('product__product_type', 'product__size_category', 'service_category')
    search_fields = ('product__product_type__name', 'product__product_type__display_name', 'product__animal_type')
    list_filter = ('service_category', 'product__product_type', 'product__animal_type')

    def get_fieldsets(self, request, obj=None):
        fieldsets = (
            (None, {'fields': ('product', 'service_category', 'average_cost', 'is_active')}),
            ('Quantity', {
                'fields': ('quantity', 'pairs', 'singles'),
                'description': "For PAIRS products, enter quantity in pairs and singles. For ITEMS products, enter total items in Quantity field."
            }),
            ('Audit Info', {'fields': ('last_audit_date',), 'classes': ('collapse',)}),
        )
        return fieldsets

    def display_quantity(self, obj):
        if obj.product.unit_of_measure == 'PAIRS':
            pairs = obj.quantity // 2
            singles = obj.quantity % 2
            return f"{pairs} pairs, {singles} singles ({obj.quantity} items)"
        return f"{obj.quantity} items"
    display_quantity.short_description = "Quantity"


admin.site.register(Inventory, InventoryAdmin)
admin.site.register(FinishedStock, FinishedStockAdmin)