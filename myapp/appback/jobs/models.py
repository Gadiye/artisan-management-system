# jobs/models.py

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Product
from artisans.models import Artisan

class Job(models.Model):
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('PARTIALLY_RECEIVED', 'Partially Received'),
        ('COMPLETED', 'Completed'),
    ]
    
    job_id = models.AutoField(primary_key=True)
    created_date = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    service_category = models.CharField(max_length=50, choices=Product.SERVICE_CATEGORIES)
    notes = models.TextField(blank=True, null=True)
    
    
    
    def update_status(self):
        total_ordered = sum(item.quantity_ordered for item in self.items.all())
        total_received = sum(item.quantity_received for item in self.items.all())
        if total_received == 0:
            self.status = 'IN_PROGRESS'
        elif total_received < total_ordered:
            self.status = 'PARTIALLY_RECEIVED'
        else:
            self.status = 'COMPLETED'
        self.save()
    
    @property
    def artisans_involved(self):
        return list(self.items.values_list('artisan__name', flat=True).distinct())

    def __str__(self):
        return f"Job #{self.job_id}"

class JobItem(models.Model):
    REJECTION_REASONS = [
        ('QUALITY', 'Quality Issues'),
        ('DAMAGE', 'Damaged Item'),
        ('OTHER', 'Other'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='items')
    artisan = models.ForeignKey(Artisan, on_delete=models.PROTECT)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity_ordered = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField(default=0)
    quantity_accepted = models.PositiveIntegerField(default=0)
    rejection_reason = models.CharField(max_length=20, choices=REJECTION_REASONS, blank=True, null=True)
    original_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    final_payment = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    payslip_generated = models.BooleanField(default=False)
    
    # Add rating field to support frontend rating display
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)],
        null=True,
        blank=True,
        help_text="Rating from 1.0 to 5.0"
    )
    
    def save(self, *args, **kwargs):
        if not self.pk:  # Only on creation
            self.original_amount = self.product.base_price * self.quantity_ordered

        # Calculate final_payment based on fixed rate per unit for the job's service category
        from django.core.exceptions import ObjectDoesNotExist

        try:
            service_rate = ServiceRate.objects.get(product=self.product, service_category=self.job.service_category)
            # Adjust quantity_accepted based on unit_of_measure for payment calculation
            quantity_for_payment = self.quantity_accepted
            if self.product.unit_of_measure == 'PAIRS':
                quantity_for_payment = self.quantity_accepted / 2 # Divide by 2 for pairs

            # Convert quantity_for_payment to Decimal before multiplication
            from decimal import Decimal # Import Decimal
            self.final_payment = service_rate.rate_per_unit * Decimal(str(quantity_for_payment))
        except ObjectDoesNotExist:
            # Handle case where no rate is defined for this product and service category
            self.final_payment = 0.00 # Default to 0 if no rate found
            # raise ValueError(f"No service rate defined for product {self.product.id} and category: {self.job.service_category}")

        super().save(*args, **kwargs)
        self.job.update_status()

class JobDelivery(models.Model):
    job_item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='deliveries')
    quantity_received = models.PositiveIntegerField()
    quantity_accepted = models.PositiveIntegerField(default=0)
    rejection_reason = models.CharField(max_length=20, choices=JobItem.REJECTION_REASONS, blank=True, null=True)
    delivery_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        # Validate quantity_received does not exceed remaining ordered quantity
        job_item = self.job_item
        current_received = sum(d.quantity_received for d in job_item.deliveries.all().exclude(pk=self.pk))
        remaining = job_item.quantity_ordered - current_received
        if self.quantity_received > remaining:
            raise ValueError(f"Cannot receive {self.quantity_received} pieces; only {remaining} pieces remain to be delivered.")
        
        super().save(*args, **kwargs)
        
        # Update JobItem totals
        job_item.quantity_received = sum(d.quantity_received for d in job_item.deliveries.all())
        job_item.quantity_accepted = sum(d.quantity_accepted for d in job_item.deliveries.all())
        job_item.rejection_reason = self.rejection_reason if self.quantity_received > self.quantity_accepted else None
        job_item.save()
        
        # Update Inventory - import here to avoid circular imports
        from inventory.models import Inventory, FinishedStock
        
        if job_item.job.service_category == 'FINISHED':
            finished_stock, created = FinishedStock.objects.get_or_create(
                product=job_item.product,
                defaults={'quantity': 0, 'average_cost': job_item.product.base_price}
            )
            finished_stock.quantity += self.quantity_accepted
            finished_stock.average_cost = (
                (finished_stock.quantity * finished_stock.average_cost + self.quantity_accepted * job_item.product.base_price)
                / (finished_stock.quantity + self.quantity_accepted)
            ) if (finished_stock.quantity + self.quantity_accepted) > 0 else job_item.product.base_price
            finished_stock.save()
        else:
            inventory, created = Inventory.objects.get_or_create(
                product=job_item.product,
                service_category=job_item.job.service_category,
                defaults={'quantity': 0, 'average_cost': job_item.product.base_price, 'price_at_this_stage': job_item.product.base_price}
            )
            inventory.quantity += self.quantity_accepted
            new_average_cost = (
                (inventory.quantity * inventory.average_cost + self.quantity_accepted * job_item.product.base_price)
                / (inventory.quantity + self.quantity_accepted)
            ) if (inventory.quantity + self.quantity_accepted) > 0 else job_item.product.base_price
            inventory.average_cost = new_average_cost
            inventory.price_at_this_stage = new_average_cost
            inventory.save()


class ServiceRate(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='job_service_rates') # Link to specific product
    SERVICE_CATEGORY_CHOICES = [
        ('CARVING', 'Carving'),
        ('CUTTING', 'Cutting'),
        ('PAINTING', 'Painting'),
        ('SANDING', 'Sanding'),
        ('FINISHING', 'Finishing'),
        ('FINISHED', 'Finished'),
    ]
    service_category = models.CharField(max_length=50, choices=SERVICE_CATEGORY_CHOICES)
    rate_per_unit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        unique_together = ('product', 'service_category') # Ensure unique rate per product-service combo
        verbose_name = "Service Rate"
        verbose_name_plural = "Service Rates"

    def __str__(self):
        return f"{self.product.product_type} - {self.product.animal_type} ({self.service_category}) Rate: Ksh{self.rate_per_unit}/unit"