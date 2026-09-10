# jobs/models.py

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Product
from artisans.models import Artisan
from viewflow.fsm import State

class Job(models.Model):
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('PARTIALLY_RECEIVED', 'Partially Received'),
        ('COMPLETED', 'Completed'),
    ]
    
    job_id = models.AutoField(primary_key=True)
    created_date = models.DateTimeField(default=timezone.now, db_index=True)
    created_by = models.CharField(max_length=100)
    
    _status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        db_column='status'
    )
    status = State(dict(STATUS_CHOICES), default='IN_PROGRESS')

    @status.getter()
    def _status_getter(self):
        return self._status

    @status.setter()
    def _status_setter(self, value):
        self._status = value

    @status.on_success()
    def _save_after_transition(self, descriptor, source, target, **kwargs):
        self.save()
    
    service_category = models.ForeignKey('products.ServiceCategory', on_delete=models.PROTECT)
    notes = models.TextField(blank=True, null=True)
    
    # Denormalized fields for performance
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_final_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    @status.transition(source=State.ANY, target='IN_PROGRESS')
    def reset_to_in_progress(self):
        pass

    @status.transition(source='IN_PROGRESS', target='PARTIALLY_RECEIVED')
    def mark_partially_received(self):
        pass

    @status.transition(source=['IN_PROGRESS', 'PARTIALLY_RECEIVED'], target='COMPLETED')
    def mark_completed(self):
        pass

    @property
    def artisans_involved(self):
        # Read from memory to fully utilize prefetch_related cache and avoid N+1 queries
        return list(set(item.artisan.name for item in self.items.all() if item.artisan))

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
    final_payment = models.DecimalField(max_digits=10, decimal_places=2, editable=False, default=0.00)
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

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

class JobDelivery(models.Model):
    job_item = models.ForeignKey(JobItem, on_delete=models.CASCADE, related_name='deliveries')
    quantity_received = models.PositiveIntegerField()
    quantity_accepted = models.PositiveIntegerField(default=0)
    rejection_reason = models.CharField(max_length=20, choices=JobItem.REJECTION_REASONS, blank=True, null=True)
    delivery_date = models.DateTimeField(default=timezone.now, db_index=True)
    notes = models.TextField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class ServiceRate(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='job_service_rates') # Link to specific product
    service_category = models.ForeignKey('products.ServiceCategory', on_delete=models.CASCADE, related_name='job_service_rates')
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
    from_stage = models.ForeignKey('products.ServiceCategory', on_delete=models.PROTECT, related_name='transactions_from')
    to_stage = models.ForeignKey('products.ServiceCategory', on_delete=models.PROTECT, related_name='transactions_to')
    quantity = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Job Transaction"
        verbose_name_plural = "Job Transactions"

    def __str__(self):
        job_id_str = f"Job #{self.job.job_id}" if self.job else "No Job"
        return f"{job_id_str}: {self.quantity} x {self.product} from {self.from_stage} to {self.to_stage}"