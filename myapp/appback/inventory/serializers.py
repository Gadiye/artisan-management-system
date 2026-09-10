from rest_framework import serializers
from django.utils import timezone
from .models import Inventory, FinishedStock, InventoryReservation
from products.models import Product
from products.serializers import ProductSerializer
from jobs.models import JobDelivery


class InventoryReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryReservation
        fields = ['id', 'job_item', 'inventory', 'quantity_reserved', 'status']




class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model to include in inventory responses.
    """
    product_type = serializers.CharField(source='product_type.name', read_only=True)
    product_type_display = serializers.CharField(source='product_type.display_name', read_only=True)
    size_category = serializers.CharField(source='size_category.name', read_only=True, allow_null=True)
    size_category_display = serializers.CharField(source='size_category.display_name', read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = ['id', 'product_type', 'product_type_display', 'animal_type', 'size_category', 'size_category_display', 'unit_of_measure']
        read_only_fields = ['id']


class InventorySerializer(serializers.ModelSerializer):
    """
    Basic serializer for Inventory model.
    """
    product = ProductSerializer(read_only=True)
    service_category = serializers.CharField(source='service_category.name', read_only=True)
    service_category_id = serializers.IntegerField(source='service_category.id', read_only=True)
    service_category_display = serializers.CharField(source='service_category.display_name', read_only=True)
    
    class Meta:
        model = Inventory
        fields = ['id', 'product', 'service_category', 'service_category_id', 'service_category_display', 'quantity', 'average_cost', 'last_updated']
        read_only_fields = ['id', 'last_updated']


class InventoryDetailSerializer(InventorySerializer):
    """
    Detailed serializer for Inventory model with additional fields.
    """
    class Meta(InventorySerializer.Meta):
        fields = InventorySerializer.Meta.fields + ['created_at']
        read_only_fields = InventorySerializer.Meta.read_only_fields + ['created_at']


class InventoryCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new inventory records.
    """
    service_category = serializers.CharField()

    class Meta:
        model = Inventory
        fields = ['product', 'service_category', 'quantity', 'average_cost']
    
    def validate_service_category(self, value):
        from products.models import ServiceCategory
        if isinstance(value, ServiceCategory):
            return value
        if str(value).isdigit():
            try:
                return ServiceCategory.objects.get(id=int(value))
            except ServiceCategory.DoesNotExist:
                raise serializers.ValidationError(f"ServiceCategory with ID {value} does not exist.")
        try:
            return ServiceCategory.objects.get(name=value)
        except ServiceCategory.DoesNotExist:
            sc = ServiceCategory.objects.filter(display_name__iexact=value).first()
            if sc:
                return sc
            raise serializers.ValidationError(f"ServiceCategory '{value}' does not exist.")
    
    def validate_quantity(self, value):
        """
        Validate that quantity is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value
    
    def validate_average_cost(self, value):
        """
        Validate that average_cost is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Average cost cannot be negative.")
        return value
    
    def validate(self, attrs):
        """
        Validate the combination of product and service_category.
        """
        product = attrs.get('product')
        service_category = attrs.get('service_category')
        
        # Check if this combination already exists
        if Inventory.objects.filter(product=product, service_category=service_category).exists():
            raise serializers.ValidationError(
                "Inventory record already exists for this product and service category combination."
            )
        
        return attrs


class InventoryUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating inventory records.
    """
    class Meta:
        model = Inventory
        fields = ['quantity', 'average_cost']
    
    def validate_quantity(self, value):
        """
        Validate that quantity is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value
    
    def validate_average_cost(self, value):
        """
        Validate that average_cost is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Average cost cannot be negative.")
        return value


class JobDeliverySerializer(serializers.ModelSerializer):
    """
    Serializer for JobDelivery model to include in inventory delivery history.
    """
    artisan_name = serializers.CharField(source='job_item.artisan.name', read_only=True)
    job_item_id = serializers.IntegerField(source='job_item.id', read_only=True)
    
    class Meta:
        model = JobDelivery
        fields = [
            'id', 'job_item_id', 'artisan_name', 'quantity_received', 
            'quantity_accepted', 'delivery_date', 'notes'
        ]
        read_only_fields = ['id']


class FinishedStockSerializer(serializers.ModelSerializer):
    """
    Serializer for FinishedStock model.
    """
    product = ProductSerializer(read_only=True)

    class Meta:
        model = FinishedStock
        fields = ['id', 'product', 'quantity', 'average_cost', 'last_updated']
        read_only_fields = ['id', 'last_updated']


class InventoryStockUpdateSerializer(serializers.Serializer):
    """
    Serializer for manual stock adjustments.
    """
    adjustment_type = serializers.ChoiceField(
        choices=[('ADD', 'Add'), ('SUBTRACT', 'Subtract'), ('SET', 'Set')],
        help_text="Type of adjustment: ADD (increase), SUBTRACT (decrease), or SET (set to specific value)"
    )
    quantity = serializers.IntegerField(
        min_value=0,
        help_text="Quantity to adjust by (for ADD/SUBTRACT) or set to (for SET)"
    )
    reason = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Reason for the adjustment"
    )
    
    def validate(self, attrs):
        """
        Validate the adjustment based on current inventory.
        """
        adjustment_type = attrs.get('adjustment_type')
        quantity = attrs.get('quantity')
        
        if adjustment_type == 'SUBTRACT':
            # Get the current inventory instance from context
            inventory = self.context.get('inventory')
            if inventory and inventory.quantity < quantity:
                raise serializers.ValidationError(
                    f"Cannot subtract {quantity} from current stock of {inventory.quantity}"
                )
        
        return attrs


class InventoryBulkUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk inventory operations.
    """
    inventory_updates = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of inventory updates with id, quantity, and average_cost"
    )
    
    def validate_inventory_updates(self, value):
        """
        Validate each inventory update in the list.
        """
        validated_updates = []
        
        for update in value:
            if 'id' not in update:
                raise serializers.ValidationError("Each update must include an 'id' field.")
            
            inventory_id = update.get('id')
            try:
                inventory = Inventory.objects.get(id=inventory_id)
            except Inventory.DoesNotExist:
                raise serializers.ValidationError(f"Inventory with id {inventory_id} does not exist.")
            
            # Validate quantity if provided
            if 'quantity' in update:
                quantity = update['quantity']
                if not isinstance(quantity, int) or quantity < 0:
                    raise serializers.ValidationError(
                        f"Invalid quantity for inventory {inventory_id}: must be non-negative integer."
                    )
            
            # Validate average_cost if provided
            if 'average_cost' in update:
                average_cost = update['average_cost']
                if not isinstance(average_cost, (int, float)) or average_cost < 0:
                    raise serializers.ValidationError(
                        f"Invalid average_cost for inventory {inventory_id}: must be non-negative number."
                    )
            
            validated_updates.append({
                'inventory': inventory,
                'quantity': update.get('quantity'),
                'average_cost': update.get('average_cost')
            })
        
        return validated_updates