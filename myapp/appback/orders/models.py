from django.db import models
from customers.models import Customer
from products.models import Product

class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    order_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    created_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total before discounts and taxes")
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Grand total after discounts and taxes")
    notes = models.TextField(blank=True, null=True)
    
    def update_totals(self, save=False):
        """
        Calculates subtotal, applies discount and tax, and sets the final total.
        Does not save by default to allow for bulk operations.
        """
        from decimal import Decimal
        
        subtotal = sum(item.subtotal for item in self.items.all())
        self.subtotal = subtotal
        
        # Ensure discount is not greater than subtotal
        effective_discount = min(self.subtotal, self.discount_amount)
        
        amount_after_discount = self.subtotal - effective_discount
        
        # The tax_amount is assumed to be pre-calculated and passed in.
        self.total_amount = amount_after_discount + self.tax_amount
        
        if save:
            self.save(update_fields=['subtotal', 'discount_amount', 'tax_amount', 'total_amount'])
    
    def __str__(self):
        return f"Order #{self.order_id} - {self.customer}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    subtotal = models.GeneratedField(
        expression=models.F('quantity') * models.F('unit_price'),
        output_field=models.DecimalField(max_digits=12, decimal_places=2),
        db_persist=True
    )
    
    def save(self, *args, **kwargs):
        # Set unit_price on creation if it's not already set
        if not self.pk and not self.unit_price:
            self.unit_price = self.product.base_price
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.product} - Qty: {self.quantity}"