# artisans/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Artisan(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    @property
    def average_rating_computed(self):
        """Calculate average rating from job ratings"""
        from jobs.models import JobItem
        ratings = JobItem.objects.filter(
            artisan=self,
            rating__isnull=False
        ).values_list('rating', flat=True)
        
        if ratings:
            return sum(ratings) / len(ratings)
        return 0.0
    
    @property
    def total_jobs_computed(self):
        """Get total number of jobs"""
        from jobs.models import JobItem
        return JobItem.objects.filter(artisan=self).count()
    
    @property
    def total_earnings_computed(self):
        """Get total earnings from payslips"""
        from payslips.models import Payslip
        return float(Payslip.objects.filter(artisan=self).aggregate(
            models.Sum('total_payment')
        )['total_payment__sum'] or 0)
    
    @property
    def pending_payment_computed(self):
        """Calculate pending payments (completed jobs without payslips)"""
        from jobs.models import JobItem
        from django.db.models import Sum
        
        # Get the sum of final_payment for job items that haven't had payslips generated
        pending_sum = JobItem.objects.filter(
            artisan=self,
            payslip_generated=False,
            job__status='COMPLETED'  # Only include completed jobs
        ).aggregate(Sum('final_payment'))['final_payment__sum']
        
        return float(pending_sum or 0)
    
    @property
    def specialties_computed(self):
        """Get specialties from job categories"""
        from jobs.models import JobItem
        return list(JobItem.objects.filter(
            artisan=self
        ).values_list('job__service_category', flat=True).distinct())
    
    @property
    def last_job_date_computed(self):
        """Get date of last job"""
        from jobs.models import JobItem
        last_job = JobItem.objects.filter(
            artisan=self
        ).order_by('-job__created_date').first()
        return last_job.job.created_date if last_job else None


# You might also want to add a Rating model for job ratings
class JobRating(models.Model):
    job_item = models.OneToOneField(
        'jobs.JobItem',
        on_delete=models.CASCADE,
        related_name='rating_detail'
    )
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)]
    )
    comment = models.TextField(blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Rating {self.rating} for {self.job_item}"