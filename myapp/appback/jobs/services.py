from django.db import transaction
from decimal import Decimal
from django.core.exceptions import ObjectDoesNotExist
from inventory.models import Inventory, FinishedStock
from .models import JobDelivery, JobTransaction, ServiceRate

def calculate_item_payment(job_item):
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
            complete_pairs = job_item.quantity_accepted // 2
            single_items = job_item.quantity_accepted % 2
            rate_per_single = rate / Decimal('2')

            payment = (Decimal(str(complete_pairs)) * rate) + \
                      (Decimal(str(single_items)) * rate_per_single)
            job_item.final_payment = payment
        else:  # ITEMS
            job_item.final_payment = rate * Decimal(str(job_item.quantity_accepted))
            
    except ObjectDoesNotExist:
        # Default to 0 if no rate found
        job_item.final_payment = Decimal('0.00')
    
    job_item.save(update_fields=['final_payment'])
    return job_item.final_payment

def record_job_delivery(job_item, quantity_received, quantity_accepted, rejection_reason=None, notes=None):
    """
    Service function to record a job delivery and handle its side effects:
    1. Validate quantity_received against remaining quantity.
    2. Create the delivery record.
    3. Update JobItem totals and status (via signals).
    4. Calculate artisan payment.
    5. Create a JobTransaction record.
    6. Update Inventory or FinishedStock with new quantities and average costs.
    """
    # 1. Validation
    current_received = sum(d.quantity_received for d in job_item.deliveries.all())
    remaining = job_item.quantity_ordered - current_received
    if quantity_received > remaining:
        raise ValueError(f"Cannot receive {quantity_received} pieces; only {remaining} pieces remain to be delivered.")

    with transaction.atomic():
        # 1. Create the delivery record
        delivery = JobDelivery.objects.create(
            job_item=job_item,
            quantity_received=quantity_received,
            quantity_accepted=quantity_accepted,
            rejection_reason=rejection_reason,
            notes=notes
        )

        # 2. Update JobItem (JobItem totals and Job status are updated by signals)
        # We need to refresh job_item to get updated totals from signals before calculating payment
        job_item.refresh_from_db()
        
        # 3. Calculate artisan payment
        calculate_item_payment(job_item)
        
        if quantity_accepted > 0:
            # 4. Create Job Transaction
            JobTransaction.objects.create(
                job=job_item.job,
                product=job_item.product,
                from_stage=job_item.job.service_category,
                to_stage=job_item.job.service_category,
                quantity=quantity_accepted
            )

            # 5. Update Inventory/FinishedStock
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
