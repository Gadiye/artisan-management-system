# jobs/models.py

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Product
from artisans.models import Artisan
from django_fsm import FSMField, transition

class Job(models.Model):
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('PARTIALLY_RECEIVED', 'Partially Received'),
        ('COMPLETED', 'Completed'),
    ]
    
    job_id = models.AutoField(primary_key=True)
    created_date = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=100)
    status = FSMField(default='IN_PROGRESS', choices=STATUS_CHOICES)
    service_category = models.CharField(max_length=50, choices=Product.SERVICE_CATEGORIES)
    notes = models.TextField(blank=True, null=True)
    
    @transition(field=status, source='*', target='IN_PROGRESS')
    def reset_to_in_progress(self):
        pass

    @transition(field=status, source='IN_PROGRESS', target='PARTIALLY_RECEIVED')
    def mark_partially_received(self):
        pass

    @transition(field=status, source=['IN_PROGRESS', 'PARTIALLY_RECEIVED'], target='COMPLETED')
    def mark_completed(self):
        pass

    def update_status(self):
        total_ordered = sum(item.quantity_ordered for item in self.items.all())
        total_received = sum(item.quantity_received for item in self.items.all())
        
        old_status = self.status
        new_status = 'IN_PROGRESS'
        
        if total_received == 0:
            new_status = 'IN_PROGRESS'
        elif total_received < total_ordered:
            new_status = 'PARTIALLY_RECEIVED'
        else:
            new_status = 'COMPLETED'
            
        if old_status != new_status:
            if new_status == 'IN_PROGRESS':
                self.reset_to_in_progress()
            elif new_status == 'PARTIALLY_RECEIVED':
                self.mark_partially_received()
            elif new_status == 'COMPLETED':
                self.mark_completed()
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
    unit_price_at_creation = models.DecimalField(max_digits=10, decimal_places=2, editable=False, default=0.00)
    original_amount = models.GeneratedField(
        expression=models.F('quantity_ordered') * models.F('unit_price_at_creation'),
        output_field=models.DecimalField(max_digits=12, decimal_places=2),
        db_persist=True
    )
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
            self.unit_price_at_creation = self.product.base_price

        # Calculate final_payment based on fixed rate per unit for the job's service category
        from django.core.exceptions import ObjectDoesNotExist

        try:
            service_rate = ServiceRate.objects.get(product=self.product, service_category=self.job.service_category)
            # Calculate final_payment based on the new logic for individual items
            from decimal import Decimal # Import Decimal

            if self.product.unit_of_measure == 'PAIRS':
                rate_per_pair = service_rate.rate_per_unit
                rate_per_single = rate_per_pair / Decimal('2')

                complete_pairs = self.quantity_accepted // 2
                single_items = self.quantity_accepted % 2

                payment = (Decimal(str(complete_pairs)) * rate_per_pair) + \
                          (Decimal(str(single_items)) * rate_per_single)
                self.final_payment = payment
            else:  # ITEMS
                self.final_payment = service_rate.rate_per_unit * Decimal(str(self.quantity_accepted))
        except ObjectDoesNotExist:
            # Handle case where no rate is defined for this product and service category
            self.final_payment = 0.00 # Default to 0 if no rate found
            # raise ValueError(f"No service rate defined for product {self.product.id} and category: {self.job.service_category}")

        super().save(*args, **kwargs)

class JobDelivery(models.Model):
    job_item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='deliveries')
    quantity_received = models.PositiveIntegerField()
    quantity_accepted = models.PositiveIntegerField(default=0)
    rejection_reason = models.CharField(max_length=20, choices=JobItem.REJECTION_REASONS, blank=True, null=True)
    delivery_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class ServiceRate(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='job_service_rates') # Link to specific product
    SERVICE_CATEGORY_CHOICES = [
        ('DRAWING', 'Drawing'),
        ('CARVING', 'Carving'),
        ('CUTTING', 'Cutting'),
        ('GOUGING', 'Gouging'),
        ('SANDING', 'Sanding'),
        ('PAINTING', 'Painting'),
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

class JobTransaction(models.Model):
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, related_name='transactions')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='job_transactions')
    from_stage = models.CharField(max_length=50, choices=Product.SERVICE_CATEGORIES)
    to_stage = models.CharField(max_length=50, choices=Product.SERVICE_CATEGORIES)
    quantity = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Job Transaction"
        verbose_name_plural = "Job Transactions"

    def __str__(self):
        job_id_str = f"Job #{self.job.job_id}" if self.job else "No Job"
        return f"{job_id_str}: {self.quantity} x {self.product} from {self.from_stage} to {self.to_stage}"