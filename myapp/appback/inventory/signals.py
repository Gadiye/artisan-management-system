from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Inventory, FinishedStock, InventoryReservation

@receiver(post_delete, sender=InventoryReservation)
def restore_inventory_on_reservation_delete(sender, instance, **kwargs):
    """
    When an InventoryReservation is deleted (e.g. JobItem deleted),
    restore the reserved quantity to the original inventory if it was PENDING.
    """
    if instance.status == InventoryReservation.ReservationStatus.PENDING:
        inventory = instance.inventory
        inventory.quantity += instance.quantity_reserved
        inventory.save()

@receiver(post_save, sender=Inventory)
def sync_finished_stock_on_inventory_save(sender, instance, **kwargs):
    """
    Ensure Inventory(category=FINISHED) and FinishedStock are synchronized.
    """
    if instance.service_category == 'FINISHED':
        # Get or create FinishedStock for the same product
        finished_stock, created = FinishedStock.objects.get_or_create(
            product=instance.product,
            defaults={'quantity': instance.quantity, 'average_cost': instance.average_cost}
        )
        if not created:
            # Sync existing FinishedStock if values differ
            if finished_stock.quantity != instance.quantity or finished_stock.average_cost != instance.average_cost:
                finished_stock.quantity = instance.quantity
                finished_stock.average_cost = instance.average_cost
                finished_stock.save()

@receiver(post_delete, sender=Inventory)
def sync_finished_stock_on_inventory_delete(sender, instance, **kwargs):
    """
    When an Inventory(category=FINISHED) is deleted, handle FinishedStock consistency.
    """
    if instance.service_category == 'FINISHED':
        try:
            finished_stock = FinishedStock.objects.get(product=instance.product)
            # We can either zero it out or delete it. Deleting is more consistent if inventory is gone.
            finished_stock.delete()
        except FinishedStock.DoesNotExist:
            pass
