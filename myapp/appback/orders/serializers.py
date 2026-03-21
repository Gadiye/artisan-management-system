# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem
from customers.models import Customer
from products.models import Product
from inventory.models import FinishedStock # Assuming this exists

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email'] # Adjust fields based on your Customer model

class ProductLiteSerializer(serializers.ModelSerializer):
    # This serializer provides a lightweight summary of the product
    # Adjust fields based on your Product model structure
    class Meta:
        model = Product
        fields = ['id', 'product_type', 'animal_type'] # Example fields

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductLiteSerializer(read_only=True) # Nested read-only for detail view
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'unit_price', 'subtotal']
        read_only_fields = ['unit_price', 'subtotal'] # unit_price is set by model's save method

    def validate(self, data):
        # Validation for creating/updating OrderItem
        # Stock check is mostly handled by OrderSerializer transition logic
        return data

class OrderCreateUpdateItemSerializer(serializers.ModelSerializer):
    # This is used for writing (creating/updating) order items within an order
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product'
    )
    class Meta:
        model = OrderItem
        fields = ['product_id', 'quantity']

    def validate(self, data):
        # Basic validation
        return data


class OrderListSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'order_id', 'customer', 'created_date', 'status', 'status_display',
            'total_amount', 'notes'
        ]
        read_only_fields = ['created_date', 'total_amount']

class OrderDetailSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True) # Nested for read-only
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'order_id', 'customer', 'created_date', 'status', 'status_display',
            'total_amount', 'notes', 'items'
        ]
        read_only_fields = ['created_date', 'total_amount']

class OrderCreateSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    items = OrderCreateUpdateItemSerializer(many=True, write_only=True) # For nested creation

    class Meta:
        model = Order
        fields = ['customer', 'status', 'notes', 'items']
        extra_kwargs = {
            'status': {'required': False}, # Default 'PENDING' handled by model
            'notes': {'required': False, 'allow_null': True, 'allow_blank': True},
        }

    def validate_status(self, value):
        if value not in [choice[0] for choice in Order.STATUS_CHOICES]:
            raise serializers.ValidationError("Invalid status provided.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        status = validated_data.get('status', 'PENDING') # Get status for stock check

        # Using a transaction to ensure atomicity
        from django.db import transaction
        from inventory.models import FinishedStock

        with transaction.atomic():
            order = Order.objects.create(**validated_data)

            for item_data in items_data:
                product = item_data['product']
                quantity = item_data['quantity']

                # Create OrderItem - model's save method will set unit_price
                order_item = OrderItem.objects.create(order=order, **item_data)

                # Deduct stock ONLY if status is not PENDING
                if status in ['PROCESSING', 'SHIPPED', 'DELIVERED']:
                    try:
                        finished_stock = FinishedStock.objects.get(product=product)
                        if finished_stock.quantity < quantity:
                            raise serializers.ValidationError(
                                f"Insufficient stock for {str(product)}. Available: {finished_stock.quantity}, "
                                f"Requested: {quantity}."
                            )
                        finished_stock.quantity -= quantity
                        finished_stock.save()
                    except FinishedStock.DoesNotExist:
                        raise serializers.ValidationError(f"Stock information not found for product: {str(product)}")

            order.update_totals(save=True) # Call model method to calculate total
            return order

class OrderUpdateSerializer(serializers.ModelSerializer):
    items = OrderCreateUpdateItemSerializer(many=True, required=False) # Optional for updates

    class Meta:
        model = Order
        fields = ['status', 'notes', 'items'] # Customer not allowed to be updated

    def validate_status(self, value):
        if value not in [choice[0] for choice in Order.STATUS_CHOICES]:
            raise serializers.ValidationError("Invalid status provided.")
        return value

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        new_status = validated_data.get('status', instance.status) # Get new status or keep old

        from django.db import transaction
        from inventory.models import FinishedStock

        with transaction.atomic():
            # Handle status change and stock adjustment
            original_status = instance.status
            if new_status != original_status:
                if new_status in ['PROCESSING', 'SHIPPED', 'DELIVERED'] and original_status not in ['PROCESSING', 'SHIPPED', 'DELIVERED']:
                    # Transitioning to a stock-deducting status
                    for item in instance.items.all():
                        try:
                            finished_stock = FinishedStock.objects.get(product=item.product)
                            if finished_stock.quantity < item.quantity:
                                raise serializers.ValidationError(
                                    f"Insufficient stock for {str(item.product)} "
                                    f"to fulfill order {instance.order_id} with new status: "
                                    f"{finished_stock.quantity} available, {item.quantity} needed."
                                )
                            finished_stock.quantity -= item.quantity
                            finished_stock.save()
                        except FinishedStock.DoesNotExist:
                            raise serializers.ValidationError(f"Stock information not found for product: {str(item.product)}")

                elif new_status == 'CANCELLED' and original_status not in ['PENDING', 'CANCELLED']:
                    # Transitioning to CANCELLED from a status where stock was deducted
                    for item in instance.items.all():
                        try:
                            finished_stock = FinishedStock.objects.get(product=item.product)
                            finished_stock.quantity += item.quantity # Restore stock
                            finished_stock.save()
                        except FinishedStock.DoesNotExist:
                            # Log this, but don't block cancel if stock model somehow disappeared
                            print(f"Warning: Stock not found for {str(item.product)} during cancellation of Order {instance.order_id}")


            # Update basic order fields
            instance.status = new_status
            instance.notes = validated_data.get('notes', instance.notes)
            instance.save() # Save order to update its fields

            # Handle nested item updates (add, update quantity, remove)
            if items_data is not None:
                current_item_ids = {item.id for item in instance.items.all()}
                incoming_item_ids = set()

                for item_data in items_data:
                    item_id = item_data.get('id') # Assuming 'id' can be passed for existing items

                    if item_id: # Existing item
                        incoming_item_ids.add(item_id)
                        try:
                            order_item = instance.items.get(id=item_id)
                            original_quantity = order_item.quantity
                            new_quantity = item_data.get('quantity', original_quantity)
                            quantity_change = new_quantity - original_quantity

                            # Validate and adjust stock for quantity change
                            if new_quantity != original_quantity and new_status in ['PROCESSING', 'SHIPPED', 'DELIVERED']:
                                finished_stock = FinishedStock.objects.get(product=order_item.product)
                                if finished_stock.quantity < quantity_change:
                                    raise serializers.ValidationError(
                                        f"Insufficient stock for {str(order_item.product)}. "
                                        f"Available: {finished_stock.quantity}, Need: {quantity_change}."
                                    )
                                finished_stock.quantity -= quantity_change
                                finished_stock.save()

                            order_item.quantity = new_quantity
                            order_item.save() # Call OrderItem's save to update unit_price if needed and total
                        except OrderItem.DoesNotExist:
                            raise serializers.ValidationError(f"OrderItem with ID {item_id} not found in this order.")
                    else: # New item
                        product = item_data['product']
                        quantity = item_data['quantity']

                        # Stock validation for new item
                        if new_status in ['PROCESSING', 'SHIPPED', 'DELIVERED']:
                            try:
                                finished_stock = FinishedStock.objects.get(product=product)
                                if finished_stock.quantity < quantity:
                                    raise serializers.ValidationError(
                                        f"Insufficient stock for {str(product)}. Available: {finished_stock.quantity}, "
                                        f"Requested: {quantity}."
                                    )
                                finished_stock.quantity -= quantity
                                finished_stock.save()
                            except FinishedStock.DoesNotExist:
                                raise serializers.ValidationError(f"Stock information not found for product: {str(product)}")

                        OrderItem.objects.create(order=instance, **item_data)

                # Remove items that are no longer in the list
                items_to_remove_ids = current_item_ids - incoming_item_ids
                for item_id in items_to_remove_ids:
                    item_to_remove = instance.items.get(id=item_id)
                    if new_status not in ['PENDING', 'CANCELLED']: # Only restore stock if not PENDING or CANCELLED
                        try:
                            finished_stock = FinishedStock.objects.get(product=item_to_remove.product)
                            finished_stock.quantity += item_to_remove.quantity # Restore stock
                            finished_stock.save()
                        except FinishedStock.DoesNotExist:
                            print(f"Warning: Stock not found for {str(item_to_remove.product)} when removing item from Order {instance.order_id}")
                    item_to_remove.delete()


            instance.update_totals(save=True) # Recalculate total after item changes

            return instance


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=20)

    def validate_status(self, value):
        if value not in [choice[0] for choice in Order.STATUS_CHOICES]:
            raise serializers.ValidationError("Invalid status provided.")
        return value