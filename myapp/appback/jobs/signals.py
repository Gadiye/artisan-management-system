from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import JobItem, JobDelivery

@receiver([post_save, post_delete], sender=JobItem)
def update_job_status_on_item_change(sender, instance, **kwargs):
    """
    Update the parent Job's status whenever a JobItem is saved or deleted.
    """
    instance.job.update_status()

@receiver([post_save, post_delete], sender=JobDelivery)
def update_job_item_on_delivery_change(sender, instance, **kwargs):
    """
    Update the parent JobItem's totals whenever a JobDelivery is saved or deleted.
    """
    job_item = instance.job_item
    # We use update() to avoid triggering JobItem's save() logic multiple times
    # and to keep it efficient, but we then need to call update_status on the job.
    # Actually, JobItem.save() now triggers the signal above, so calling save() is fine.
    
    from django.db.models import Sum
    totals = job_item.deliveries.aggregate(
        total_received=Sum('quantity_received'),
        total_accepted=Sum('quantity_accepted')
    )
    
    job_item.quantity_received = totals['total_received'] or 0
    job_item.quantity_accepted = totals['total_accepted'] or 0
    # Update rejection reason if needed
    if job_item.quantity_received > job_item.quantity_accepted:
        # Get the latest delivery with a rejection reason
        latest_rejection = job_item.deliveries.filter(rejection_reason__isnull=False).order_by('-delivery_date').first()
        job_item.rejection_reason = latest_rejection.rejection_reason if latest_rejection else None
    else:
        job_item.rejection_reason = None
        
    job_item.save()
