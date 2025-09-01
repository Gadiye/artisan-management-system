# jobs/serializers.py
from rest_framework import serializers
from .models import Job, JobItem, JobDelivery, ServiceRate
from artisans.models import Artisan # Assuming Artisan app
from products.models import Product # Assuming Product app

# --- Lite Serializers for Nested Data ---

class ArtisanJobItemLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artisan
        fields = ['id', 'name']

class ProductJobItemLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'product_type', 'animal_type', 'base_price']


# --- JobItem Serializers ---

class JobItemDeliverySerializer(serializers.ModelSerializer):
    """Serializer for JobDelivery when creating/listing deliveries."""
    class Meta:
        model = JobDelivery
        fields = ['id', 'quantity_received', 'quantity_accepted', 'rejection_reason', 'delivery_date', 'notes']
        read_only_fields = ['delivery_date']

    def validate(self, data):
        # Additional validation can be added here, e.g., quantity_accepted <= quantity_received
        if data.get('quantity_accepted', 0) > data.get('quantity_received', 0):
            raise serializers.ValidationError("Quantity accepted cannot exceed quantity received.")
        return data


class JobItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating JobItems."""
    artisan = serializers.PrimaryKeyRelatedField(queryset=Artisan.objects.all())
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())

    class Meta:
        model = JobItem
        fields = [
            'id', 'artisan', 'product', 'quantity_ordered', 'quantity_received',
            'quantity_accepted', 'rejection_reason', 'payslip_generated'
        ]
        read_only_fields = ['payslip_generated', 'quantity_received', 'quantity_accepted', 'rejection_reason'] # These are managed by deliveries
        extra_kwargs = {
            'quantity_ordered': {'min_value': 1}
        }

    

    def create(self, validated_data):
        job = self.context['job']
        validated_data['job'] = job

        product = validated_data['product']
        quantity_ordered = validated_data['quantity_ordered']
        # Use the job's service_category as the current_service_category for deduction logic
        current_service_category = job.service_category

        # Define the production chain mapping
        # Key: current service category of the job item
        # Value: list of possible previous service categories to deduct from (in order of preference)
        PRODUCTION_CHAIN_MAP = {
            'SANDING': ['CARVING', 'CUTTING'],
            'PAINTING': ['SANDING'],
            'FINISHING': ['PAINTING'],
            'FINISHED': ['FINISHING'],
        }

        previous_categories_to_check = PRODUCTION_CHAIN_MAP.get(current_service_category)

        if previous_categories_to_check:
            from inventory.models import Inventory # Local import to avoid circular dependency

            deducted = False
            for prev_cat in previous_categories_to_check:
                print(f"Attempting to deduct from product: {product.id} ({product.product_type} - {product.animal_type}), service_category: {prev_cat}, ordered: {quantity_ordered}")
                try:
                    inventory_item = Inventory.objects.get(
                        product=product,
                        service_category=prev_cat
                    )
                    print(f"Found inventory item: ID={inventory_item.id}, Current Quantity={inventory_item.quantity}, Is Active={inventory_item.is_active}")

                    if inventory_item.quantity >= quantity_ordered:
                        inventory_item.quantity -= quantity_ordered
                        inventory_item.save()
                        deducted = True
                        print(f"Deduction successful. New quantity: {inventory_item.quantity}")
                        break # Successfully deducted, move to next item
                    else:
                        print(f"Insufficient quantity in {prev_cat}. Needed: {quantity_ordered}, Available: {inventory_item.quantity}")
                        continue

                except Inventory.DoesNotExist:
                    print(f"Inventory item not found for product {product.id} and service_category {prev_cat}")
                    continue

            if not deducted:
                # If we reached here, it means deduction failed from all possible previous categories
                raise serializers.ValidationError(
                    f"Insufficient or no stock found in previous stages ({', '.join(previous_categories_to_check)}) "
                    f"for {product.product_type} - {product.animal_type} (Ordered: {quantity_ordered})."
                )

        # original_amount and final_payment are set in model's save method
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Prevent changing job for an existing job item
        if 'job' in validated_data and validated_data['job'] != instance.job:
            raise serializers.ValidationError({"job": "Job cannot be changed for an existing job item."})
        # Prevent changing artisan or product after creation if desired
        if 'artisan' in validated_data and validated_data['artisan'] != instance.artisan:
            raise serializers.ValidationError({"artisan": "Artisan cannot be changed for an existing job item."})
        if 'product' in validated_data and validated_data['product'] != instance.product:
            raise serializers.ValidationError({"product": "Product cannot be changed for an existing job item."})

        # Manual fields are quantity_ordered
        instance.quantity_ordered = validated_data.get('quantity_ordered', instance.quantity_ordered)
        # Other fields (quantity_received, quantity_accepted, rejection_reason, payslip_generated)
        # are updated by JobDelivery or Payslip logic, so they are read-only here.

        instance.save() # This will trigger the model's save and update job status
        return instance


class JobItemDetailListSerializer(serializers.ModelSerializer):
    """Serializer for listing and retrieving JobItems, with nested related data."""
    artisan = ArtisanJobItemLiteSerializer(read_only=True)
    product = ProductJobItemLiteSerializer(read_only=True)
    deliveries = JobItemDeliverySerializer(many=True, read_only=True) # Nested deliveries
    service_rate_per_unit = serializers.SerializerMethodField()

    class Meta:
        model = JobItem
        fields = [
            'id', 'job', 'artisan', 'product', 'quantity_ordered',
            'quantity_received', 'quantity_accepted', 'rejection_reason',
            'original_amount', 'final_payment', 'payslip_generated', 'deliveries',
            'service_rate_per_unit'
        ]
        read_only_fields = [
            'quantity_received', 'quantity_accepted', 'rejection_reason',
            'original_amount', 'final_payment', 'payslip_generated'
        ]

    def get_service_rate_per_unit(self, obj):
        from django.core.exceptions import ObjectDoesNotExist
        print(f"Attempting to get service rate for Product ID: {obj.product.id}, Job Service Category: {obj.job.service_category}")
        try:
            # Get the service rate based on the job item's product and the job's service category
            service_rate = ServiceRate.objects.get(product=obj.product, service_category=obj.job.service_category)
            print(f"  Found ServiceRate: {service_rate.rate_per_unit}")
            return service_rate.rate_per_unit
        except ObjectDoesNotExist:
            print(f"  ServiceRate not found for Product ID {obj.product.id} and Service Category '{obj.job.service_category}'.")
            return None # Or 0.00, depending on how you want to represent missing rates


# --- Job Serializers ---

class JobListSerializer(serializers.ModelSerializer):
    """Serializer for listing Jobs."""
    service_category_display = serializers.CharField(source='get_service_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_cost = serializers.FloatField(read_only=True)
    total_final_payment = serializers.FloatField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'job_id', 'created_date', 'created_by', 'status', 'status_display',
            'service_category', 'service_category_display', 'notes',
            'total_cost', 'total_final_payment', 'artisans_involved'
        ]
        read_only_fields = ['created_date', 'status', 'total_cost', 'total_final_payment', 'artisans_involved']


class JobDetailSerializer(JobListSerializer):
    """Serializer for retrieving a single Job, with nested JobItems."""
    items = JobItemDetailListSerializer(many=True, read_only=True) # Nested job items

    class Meta(JobListSerializer.Meta):
        fields = JobListSerializer.Meta.fields + ['items']


class JobCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating Jobs."""
    items = JobItemCreateUpdateSerializer(many=True, write_only=True)
    created_by = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'job_id', 'created_date', 'created_by', 'status', 
            'service_category', 'notes', 'items'
        ]
        read_only_fields = ['job_id', 'created_date']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("A job must have at least one item.")
        
        # This validation was removed because Product.service_category no longer exists.
        # The job's service_category now defines the stage, not the product's inherent category.
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        job = Job.objects.create(**validated_data)
        for item_data in items_data:
            # Extract PKs from the validated model instances
            processed_item_data = {
                'artisan': item_data['artisan'].id,
                'product': item_data['product'].id,
                'quantity_ordered': item_data['quantity_ordered'],
            }
            item_serializer = JobItemCreateUpdateSerializer(data=processed_item_data, context={'job': job})
            item_serializer.is_valid(raise_exception=True)
            item_serializer.save() # This will call the create method of JobItemCreateUpdateSerializer
        return job

    def update(self, instance, validated_data):
        # Basic job fields update
        instance.service_category = validated_data.get('service_category', instance.service_category)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        # For updating items, it's better to use the dedicated JobItem endpoints
        # as handling nested updates here can be complex (e.g., identifying which item to update).
        # If full nested updates are needed, this logic would need to be expanded significantly.
        
        return instance

    def validate_service_category(self, value):
        if value not in [choice[0] for choice in Product.SERVICE_CATEGORIES]:
            raise serializers.ValidationError("Invalid service category.")
        return value


class ServiceRateSerializer(serializers.ModelSerializer):
    product = ProductJobItemLiteSerializer(read_only=True) # Use the lite serializer for nested product details

    class Meta:
        model = ServiceRate
        fields = ['id', 'product', 'service_category', 'rate_per_unit']
    rate_per_unit = serializers.FloatField()


class RateDetailSerializer(serializers.Serializer):
    """Describes the rates for a specific size."""
    size = serializers.CharField()
    Carving = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Sanding = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Painting = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Cutting = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Finishing = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

class HierarchicalServiceRateSerializer(serializers.Serializer):
    """Describes a product with its animal type and a list of rates for different sizes."""
    product_category = serializers.CharField()
    animal = serializers.CharField()
    rates = RateDetailSerializer(many=True)