from django.db import transaction
from decimal import Decimal
from django.core.exceptions import ObjectDoesNotExist
from inventory.models import Inventory, FinishedStock
from .models import JobDelivery, JobTransaction, ServiceRate

def calculate_item_payment(job_item, save=True):
    """
    Calculates the final payment for an artisan based on accepted quantities.
    Handles the 0.5x rate for single items in PAIRS products.
    """
    try:
        service_rate = ServiceRate.objects.get(
            product=job_item.product, 
            service_category=job_item.job.service_category
        )
        rate = service_rate.rate_per_unit
        
        if job_item.product.unit_of_measure == 'PAIRS':
            # Logic: (Full Pairs * Rate) + (Leftover Singles * 0.5 * Rate)
            from decimal import Decimal
            complete_pairs = job_item.quantity_accepted // 2
            single_items = job_item.quantity_accepted % 2
            rate_per_single = rate / Decimal('2')

            payment = (Decimal(str(complete_pairs)) * rate) + \
                      (Decimal(str(single_items)) * rate_per_single)
            job_item.final_payment = payment
        else:  # ITEMS
            from decimal import Decimal
            job_item.final_payment = rate * Decimal(str(job_item.quantity_accepted))
            
    except ObjectDoesNotExist:
        # Default to 0 if no rate found
        from decimal import Decimal
        job_item.final_payment = Decimal('0.00')
    
    if save:
        job_item.save(update_fields=['final_payment'])
    return job_item.final_payment

@transaction.atomic
def record_job_delivery(job_item, quantity_received, quantity_accepted, rejection_reason=None, notes=None):
    """
    Service function to record a job delivery and handle its side effects:
    1. Validate quantity_received against remaining quantity.
    2. Create the delivery record.
    3. Update JobItem totals and status explicitly.
    4. Calculate artisan payment.
    5. Update parent Job status explicitly.
    6. Create a JobTransaction record.
    7. Update Inventory or FinishedStock with new quantities and average costs.
    """
    # 1. Validation
    from django.db.models import Sum
    current_received = job_item.deliveries.aggregate(total=Sum('quantity_received'))['total'] or 0
    remaining = job_item.quantity_ordered - current_received
    if quantity_received > remaining:
        raise ValueError(f"Cannot receive {quantity_received} pieces; only {remaining} pieces remain to be delivered.")

    # 1. Create the delivery record
    delivery = JobDelivery.objects.create(
        job_item=job_item,
        quantity_received=quantity_received,
        quantity_accepted=quantity_accepted,
        rejection_reason=rejection_reason,
        notes=notes
    )

    # 2. Update JobItem totals (Explicitly instead of using signals)
    totals = job_item.deliveries.aggregate(
        total_received=Sum('quantity_received'),
        total_accepted=Sum('quantity_accepted')
    )
    
    job_item.quantity_received = totals['total_received'] or 0
    job_item.quantity_accepted = totals['total_accepted'] or 0
    
    # Update rejection reason if needed
    if job_item.quantity_received > job_item.quantity_accepted:
        latest_rejection = job_item.deliveries.filter(rejection_reason__isnull=False).order_by('-delivery_date').first()
        job_item.rejection_reason = latest_rejection.rejection_reason if latest_rejection else None
    else:
        job_item.rejection_reason = None
        
    # 3. Calculate artisan payment (without saving yet)
    calculate_item_payment(job_item, save=False)
    
    # Save job_item once with all updates
    job_item.save()

    # 4. Update parent Job status explicitly (this will also update denormalized totals)
    job_item.job.update_status()
    
    if quantity_accepted > 0:
        # 5. Create Job Transaction
        JobTransaction.objects.create(
            job=job_item.job,
            product=job_item.product,
            from_stage=job_item.job.service_category,
            to_stage=job_item.job.service_category,
            quantity=quantity_accepted
        )

        # 6. Update Inventory/FinishedStock
        if job_item.job.service_category == 'FINISHED':
            finished_stock, _ = FinishedStock.objects.get_or_create(
                product=job_item.product,
                defaults={'quantity': 0, 'average_cost': job_item.product.base_price}
            )
            
            old_quantity = finished_stock.quantity
            old_avg_cost = Decimal(str(finished_stock.average_cost))
            added_quantity = quantity_accepted
            added_price = Decimal(str(job_item.product.base_price))
            
            new_total_quantity = old_quantity + added_quantity
            if new_total_quantity > 0:
                finished_stock.average_cost = (
                    (Decimal(str(old_quantity)) * old_avg_cost + Decimal(str(added_quantity)) * added_price)
                    / Decimal(str(new_total_quantity))
                )
            finished_stock.quantity = new_total_quantity
            finished_stock.save()
        else:
            inventory, _ = Inventory.objects.get_or_create(
                product=job_item.product,
                service_category=job_item.job.service_category,
                defaults={
                    'quantity': 0, 
                    'average_cost': job_item.product.base_price, 
                    'price_at_this_stage': job_item.product.base_price
                }
            )
            
            old_quantity = inventory.quantity
            old_avg_cost = Decimal(str(inventory.average_cost))
            added_quantity = quantity_accepted
            added_price = Decimal(str(job_item.product.base_price))
            
            new_total_quantity = old_quantity + added_quantity
            if new_total_quantity > 0:
                new_average_cost = (
                    (Decimal(str(old_quantity)) * old_avg_cost + Decimal(str(added_quantity)) * added_price)
                    / Decimal(str(new_total_quantity))
                )
                inventory.average_cost = new_average_cost
                inventory.price_at_this_stage = new_average_cost
            
            inventory.quantity = new_total_quantity
            inventory.save()

    return delivery
