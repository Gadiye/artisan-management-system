# financials/models.py

from django.db import models
from django.core.validators import MinValueValidator
from artisans.models import Artisan
from products.models import Product

class Payslip(models.Model):
    artisan = models.ForeignKey(Artisan, on_delete=models.PROTECT)
    service_category = models.CharField(max_length=50, choices=Product.SERVICE_CATEGORIES, blank=True, null=True)
    generated_date = models.DateTimeField(auto_now_add=True, db_index=True)
    spreadsheet_file = models.FileField(upload_to='payslips/')
    total_payment = models.DecimalField(max_digits=12, decimal_places=2)
    total_advances_deducted = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    period_start = models.DateField()
    period_end = models.DateField()
    
    def __str__(self):
        return f"Payslip for {self.artisan} - {self.generated_date.strftime('%Y-%m-%d')}"

class ServiceRate(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='payslip_service_rates', help_text="The product this service rate applies to.")
    service_category = models.CharField(
        max_length=50,
        choices=Product.SERVICE_CATEGORIES,
        help_text="The stage/service category this rate is for (e.g., CARVING, PAINTING)."
    )
    rate_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="The rate paid to an artisan per unit of this product for this service category."
    )
    is_active = models.BooleanField(default=True, help_text="Whether this service rate is currently active.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'service_category')
        verbose_name = "Service Rate"
        verbose_name_plural = "Service Rates"
        ordering = ['product__product_type', 'product__animal_type', 'service_category']

    def __str__(self):
        return f"{self.product.product_type} ({self.product.animal_type}) - {self.service_category}: ${self.rate_per_unit}/unit"

class ArtisanAdvance(models.Model):
    artisan = models.ForeignKey(Artisan, on_delete=models.PROTECT, related_name='advances')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    date_given = models.DateTimeField(auto_now_add=True, db_index=True)
    reason = models.TextField(blank=True, null=True)
    is_settled = models.BooleanField(default=False)
    balance = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], editable=False)

    class Meta:
        ordering = ['-date_given']
        verbose_name = "Artisan Advance"
        verbose_name_plural = "Artisan Advances"

    def save(self, *args, **kwargs):
        if not self.pk: # Set balance only on creation
            self.balance = self.amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Advance of Ksh{self.amount} to {self.artisan.name} on {self.date_given.strftime('%Y-%m-%d')}"

class AdvanceDeduction(models.Model):
    advance = models.ForeignKey(ArtisanAdvance, on_delete=models.CASCADE, related_name='deductions')
    payslip = models.ForeignKey(Payslip, on_delete=models.SET_NULL, null=True, blank=True, related_name='advance_deductions')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    date_deducted = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-date_deducted']
        verbose_name = "Advance Deduction"
        verbose_name_plural = "Advance Deductions"

    def __str__(self):
        return f"Deduction of Ksh{self.amount} from {self.advance} on {self.date_deducted.strftime('%Y-%m-%d')}"