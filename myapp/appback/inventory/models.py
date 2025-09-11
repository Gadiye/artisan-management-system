from django.db import models
from django.core.validators import MinValueValidator
from products.models import Product

class Inventory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    service_category = models.CharField(
        max_length=50, 
        choices=[
            ('CARVING', 'Carving'),
            ('CUTTING', 'Cutting'),
            ('PAINTING', 'Painting'),
            ('SANDING', 'Sanding'),
            ('FINISHING', 'Finishing'),
            ('FINISHED', 'Finished'),
        ]
    )
    quantity = models.PositiveIntegerField(default=0)
    average_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)]
    )
    price_at_this_stage = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)],
        default=0.00 # Default to 0, will be set on creation/update
    )
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)  # For soft deletion
    
    def __str__(self):
        return f"{self.product} - Qty: {self.quantity}"
    
    class Meta:
        verbose_name_plural = "Inventories"
        unique_together = ('product', 'service_category')  # Prevent duplicates
        indexes = [
            models.Index(fields=['product', 'service_category']),
            models.Index(fields=['is_active']),
        ]

class FinishedStock(models.Model):
    product = models.ForeignKey(
        Product, 
        on_delete=models.PROTECT
    )
    quantity = models.PositiveIntegerField(default=0)
    average_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)]
    )
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)  # For soft deletion
    
    def __str__(self):
        return f"{self.product} - Stock: {self.quantity}"
    
    class Meta:
        ordering = ['id']
        verbose_name_plural = "Finished Stock"
        unique_together = ('product',)  # One record per product
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['is_active']),
        ]

# Custom manager for soft deletion support
class ActiveInventoryManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

class ActiveFinishedStockManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

# Add managers to the models
Inventory.add_to_class('objects', models.Manager())  # Default manager
Inventory.add_to_class('active', ActiveInventoryManager())  # Active records only

FinishedStock.add_to_class('objects', models.Manager())  # Default manager
FinishedStock.add_to_class('active', ActiveFinishedStockManager())  # Active records only