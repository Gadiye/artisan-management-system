from django.db import transaction
from .models import Inventory, FinishedStock

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
