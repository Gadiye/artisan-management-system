from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from products.models import ServiceCategory

from .models import Inventory, FinishedStock


def tag_finished_stock_movement(instance, reference, note=""):
    """
    Attach context that the FinishedStock post_save signal stores on the
    generated movement record.
    """
    instance._movement_reference = reference
    instance._movement_note = note
    return instance


@transaction.atomic
def add_finished_stock(product, quantity, average_cost=None, reference="Manual stock entry", note=""):
    """
    Receive finished stock for a product.

    The supplied average cost is blended with any existing stock so the
    warehouse average stays accurate. The matching FINISHED inventory record is
    kept in sync because other parts of the system read from it.
    """
    quantity = int(quantity)
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")

    finished_stock, created = FinishedStock.objects.select_for_update().get_or_create(
        product=product,
        defaults={
            'quantity': 0,
            'average_cost': average_cost if average_cost is not None else product.base_price,
        },
    )

    old_quantity = finished_stock.quantity
    new_quantity = old_quantity + quantity

    if average_cost is not None:
        incoming_cost = Decimal(str(average_cost))
        if old_quantity > 0:
            current_cost = Decimal(str(finished_stock.average_cost))
            blended = (
                (Decimal(old_quantity) * current_cost)
                + (Decimal(quantity) * incoming_cost)
            ) / Decimal(new_quantity)
            finished_stock.average_cost = blended.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            finished_stock.average_cost = incoming_cost

    finished_stock.quantity = new_quantity
    tag_finished_stock_movement(finished_stock, reference, note)
    finished_stock.save()

    # Keep the FINISHED inventory record aligned with finished stock.
    service_category = ServiceCategory.objects.filter(name='FINISHED').first()
    if service_category:
        inventory, _ = Inventory.objects.select_for_update().get_or_create(
            product=product,
            service_category=service_category,
            defaults={
                'quantity': 0,
                'average_cost': finished_stock.average_cost,
                'price_at_this_stage': product.base_price,
            },
        )
        inventory.quantity = finished_stock.quantity
        inventory.average_cost = finished_stock.average_cost
        inventory.save()

    return finished_stock


@transaction.atomic
def sync_finished_stock(inventory):
    """
    Explicitly synchronize an Inventory(category=FINISHED) record with FinishedStock.
    """
    if inventory.service_category == 'FINISHED':
        # Get or create FinishedStock for the same product
        finished_stock, created = FinishedStock.objects.get_or_create(
            product=inventory.product,
            defaults={'quantity': inventory.quantity, 'average_cost': inventory.average_cost}
        )
        if not created:
            # Sync existing FinishedStock if values differ
            if finished_stock.quantity != inventory.quantity or finished_stock.average_cost != inventory.average_cost:
                finished_stock.quantity = inventory.quantity
                finished_stock.average_cost = inventory.average_cost
                finished_stock.save()

@transaction.atomic
def delete_inventory_and_sync(inventory):
    """
    Explicitly delete an inventory record and handle FinishedStock consistency.
    """
    if inventory.service_category == 'FINISHED':
        FinishedStock.objects.filter(product=inventory.product).delete()
    inventory.delete()
