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
    
    service_category = models.CharField(max_length=50, choices=Product.SERVICE_CATEGORIES)
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

    def update_status(self):
        # Calculate totals efficiently
        from django.db.models import Sum, F, Case, When, DecimalField
        from django.db.models.functions import Cast, Coalesce
        from decimal import Decimal

        # Get the service rate for each item in this job to calculate total_cost correctly
        # We'll do this in a single query for efficiency
        items_stats = self.items.aggregate(
            total_ordered=Sum('quantity_ordered'),
            total_received=Sum('quantity_received'),
            total_final_payment=Sum('final_payment')
        )

        total_ordered = items_stats['total_ordered'] or 0
        total_received = items_stats['total_received'] or 0
        new_total_final_payment = items_stats['total_final_payment'] or Decimal('0.00')

        # Recalculate total_cost based on current service rates
        # This is more complex because it depends on product and job's service_category
        total_cost_sum = Decimal('0.00')
        from .models import ServiceRate
        rates = ServiceRate.objects.filter(
            product__in=self.items.values_list('product', flat=True),
            service_category=self.service_category
        ).values('product_id', 'rate_per_unit')
        
        rate_map = {r['product_id']: r['rate_per_unit'] for r in rates}
        
        for item in self.items.all().select_related('product'):
            rate = rate_map.get(item.product_id, Decimal('0.00'))
            qty = Decimal(str(item.quantity_ordered))
            if item.product.unit_of_measure == 'PAIRS':
                qty = qty / Decimal('2')
            total_cost_sum += qty * rate

        old_status = self.status
        new_status = 'IN_PROGRESS'
        
        if total_received == 0:
            new_status = 'IN_PROGRESS'
        elif total_received < total_ordered:
            new_status = 'PARTIALLY_RECEIVED'
        else:
            new_status = 'COMPLETED'
            
        # Update fields
        changed = False
        if self.total_cost != total_cost_sum:
            self.total_cost = total_cost_sum
            changed = True
        if self.total_final_payment != new_total_final_payment:
            self.total_final_payment = new_total_final_payment
            changed = True

        if old_status != new_status:
            if new_status == 'IN_PROGRESS':
                self.reset_to_in_progress()
            elif new_status == 'PARTIALLY_RECEIVED':
                self.mark_partially_received()
            elif new_status == 'COMPLETED':
                self.mark_completed()
            changed = True
            
        if changed:
            self.save()
    
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
        self.job.update_status()

    def delete(self, *args, **kwargs):
        job = self.job
        super().delete(*args, **kwargs)
        job.update_status()

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
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Job Transaction"
        verbose_name_plural = "Job Transactions"

    def __str__(self):
        job_id_str = f"Job #{self.job.job_id}" if self.job else "No Job"
        return f"{job_id_str}: {self.quantity} x {self.product} from {self.from_stage} to {self.to_stage}"