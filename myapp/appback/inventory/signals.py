from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from .models import Inventory, FinishedStock, FinishedStockMovement, InventoryReservation


@receiver(pre_save, sender=FinishedStock)
def capture_previous_finished_stock_quantity(sender, instance, **kwargs):
    """Remember the previous balance so the post_save signal can log a movement."""
    if instance.pk:
        previous = sender.objects.filter(pk=instance.pk).values_list('quantity', flat=True).first()
        instance._previous_quantity = previous if previous is not None else 0
    else:
        instance._previous_quantity = 0


@receiver(post_save, sender=FinishedStock)
def record_finished_stock_movement(sender, instance, created, **kwargs):
    """Create an in/out audit record whenever the finished-stock balance changes."""
    previous = getattr(instance, '_previous_quantity', 0) or 0
    current = instance.quantity or 0
    delta = current - previous

    if delta == 0:
        return

    FinishedStockMovement.objects.create(
        product=instance.product,
        movement_type=FinishedStockMovement.MovementType.IN if delta > 0 else FinishedStockMovement.MovementType.OUT,
        quantity=abs(delta),
        balance_after=current,
        average_cost=instance.average_cost or 0,
        reference=getattr(instance, '_movement_reference', 'Stock adjustment') or 'Stock adjustment',
        note=getattr(instance, '_movement_note', '') or '',
    )


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
