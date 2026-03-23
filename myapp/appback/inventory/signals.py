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
