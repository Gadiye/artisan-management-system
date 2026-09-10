from django.db import transaction
from rest_framework import serializers
from .models import Job, JobItem, JobDelivery, ServiceRate, JobTransaction
from artisans.models import Artisan
from products.models import Product
from inventory.models import Inventory, InventoryReservation

# --- Lite Serializers for Nested Data ---

class ArtisanJobItemLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artisan
        fields = ['id', 'name']

class ProductJobItemLiteSerializer(serializers.ModelSerializer):
    product_type = serializers.CharField(source='product_type.name', read_only=True)
    product_type_display = serializers.CharField(source='product_type.display_name', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'product_type', 'product_type_display', 'animal_type', 'base_price']


# --- JobItem Serializers ---

class JobItemDeliverySerializer(serializers.ModelSerializer):
    """Serializer for JobDelivery when creating/listing deliveries."""
    class Meta:
        model = JobDelivery
        fields = ['id', 'quantity_received', 'quantity_accepted', 'rejection_reason', 'delivery_date', 'notes']
        read_only_fields = ['delivery_date']

    def validate(self, data):
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
        read_only_fields = ['payslip_generated', 'quantity_received', 'quantity_accepted', 'rejection_reason']
        extra_kwargs = {
            'quantity_ordered': {'min_value': 1}
        }

    def _create_inventory_reservation(self, job_item, bypass_inventory_deduction):
        if bypass_inventory_deduction:
            return

        job = job_item.job
        product = job_item.product
        quantity_ordered = job_item.quantity_ordered
        current_service_category = job.service_category

        PRODUCTION_CHAIN_MAP = {
            "CUTTING": [
                        "DRAWING"
            ],
            "GOUGING": [
                        "CUTTING"
            ],
            "SANDING": [
                        "CUTTING",
                        "CARVING"
            ],
            "PAINTING": [
                        "SANDING"
            ],
            "FINISHING": [
                        "PAINTING"
            ],
            "FINISHED": [
                        "FINISHING"
            ]
        }

        previous_categories_to_check = PRODUCTION_CHAIN_MAP.get(current_service_category)

        if previous_categories_to_check:
            inventory_item_to_reserve = None
            for prev_cat in previous_categories_to_check:
                try:
                    inventory_item = Inventory.objects.select_for_update().get(
                        product=product,
                        service_category=prev_cat
                    )
                    if inventory_item.quantity >= quantity_ordered:
                        inventory_item_to_reserve = inventory_item
                        break
                except Inventory.DoesNotExist:
                    continue

            if inventory_item_to_reserve:
                InventoryReservation.objects.create(
                    job_item=job_item,
                    inventory=inventory_item_to_reserve,
                    quantity_reserved=quantity_ordered
                )
                
                # Create a job transaction for the material movement
                JobTransaction.objects.create(
                    job=job,
                    product=product,
                    from_stage=inventory_item_to_reserve.service_category,
                    to_stage=current_service_category,
                    quantity=quantity_ordered
                )

                inventory_item_to_reserve.quantity -= quantity_ordered
                inventory_item_to_reserve.save()
            else:
                raise serializers.ValidationError(
                    f"Insufficient or no stock found in previous stages ({', '.join(previous_categories_to_check)}) "
                    f"for {product.product_type} - {product.animal_type} (Ordered: {quantity_ordered})."
                )

    def create(self, validated_data):
        job = self.context['job']
        validated_data['job'] = job
        job_item = super().create(validated_data)
        return job_item

    def update(self, instance, validated_data):
        if 'job' in validated_data and validated_data['job'] != instance.job:
            raise serializers.ValidationError({"job": "Job cannot be changed for an existing job item."})
        if 'artisan' in validated_data and validated_data['artisan'] != instance.artisan:
            raise serializers.ValidationError({"artisan": "Artisan cannot be changed for an existing job item."})
        if 'product' in validated_data and validated_data['product'] != instance.product:
            raise serializers.ValidationError({"product": "Product cannot be changed for an existing job item."})

        instance.quantity_ordered = validated_data.get('quantity_ordered', instance.quantity_ordered)
        instance.save()
        return instance


class JobItemDetailListSerializer(serializers.ModelSerializer):
    """Serializer for listing and retrieving JobItems, with nested related data."""
    artisan = ArtisanJobItemLiteSerializer(read_only=True)
    product = ProductJobItemLiteSerializer(read_only=True)
    deliveries = JobItemDeliverySerializer(many=True, read_only=True)
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
        # Use prefetched rates from context if available (optimized)
        service_rates = self.context.get('service_rates')
        if service_rates is not None:
            return service_rates.get(obj.product_id)
            
        # Use prefetched database cache if available (to prevent N+1 query loop in lists)
        if hasattr(obj.product, '_prefetched_objects_cache') and 'job_service_rates' in obj.product._prefetched_objects_cache:
            for rate in obj.product.job_service_rates.all():
                if rate.service_category == obj.job.service_category:
                    return rate.rate_per_unit
            return None

        # Fallback to DB query if not in context or prefetched cache
        from django.core.exceptions import ObjectDoesNotExist
        try:
            service_rate = ServiceRate.objects.get(product=obj.product, service_category=obj.job.service_category)
            return service_rate.rate_per_unit
        except ObjectDoesNotExist:
            return None


# --- Job Serializers ---

class JobListSerializer(serializers.ModelSerializer):
    """Serializer for listing Jobs."""
    service_category = serializers.CharField(source='service_category.name', read_only=True)
    service_category_id = serializers.IntegerField(source='service_category.id', read_only=True)
    service_category_display = serializers.CharField(source='service_category.display_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_cost = serializers.FloatField(read_only=True)
    total_final_payment = serializers.FloatField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'job_id', 'created_date', 'created_by', 'status', 'status_display',
            'service_category', 'service_category_id', 'service_category_display', 'notes',
            'total_cost', 'total_final_payment', 'artisans_involved'
        ]
        read_only_fields = ['created_date', 'status', 'total_cost', 'total_final_payment', 'artisans_involved']


class JobDetailSerializer(JobListSerializer):
    """Serializer for retrieving a single Job, with nested JobItems."""
    items = JobItemDetailListSerializer(many=True, read_only=True)

    class Meta(JobListSerializer.Meta):
        fields = JobListSerializer.Meta.fields + ['items']


class JobCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating Jobs."""
    service_category = serializers.CharField(required=True)
    items = JobItemCreateUpdateSerializer(many=True, write_only=True)
    created_by = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    bypass_inventory_deduction = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Job
        fields = [
            'job_id', 'created_date', 'created_by', 'status', 
            'service_category', 'notes', 'items', 'bypass_inventory_deduction'
        ]
        read_only_fields = ['job_id', 'created_date']

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
            raise serializers.ValidationError(f"Invalid service category: {value}")

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("A job must have at least one item.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        bypass_inventory_deduction = validated_data.pop('bypass_inventory_deduction', False)
        
        with transaction.atomic():
            job = Job.objects.create(**validated_data)
            
            for item_data in items_data:
                processed_item_data = {
                    'artisan': item_data['artisan'].id,
                    'product': item_data['product'].id,
                    'quantity_ordered': item_data['quantity_ordered'],
                }
                item_serializer = JobItemCreateUpdateSerializer(data=processed_item_data, context={'job': job})
                item_serializer.is_valid(raise_exception=True)
                job_item = item_serializer.save()
                
                # Create inventory reservation
                item_serializer._create_inventory_reservation(job_item, bypass_inventory_deduction)
                
            from .services import update_job_status
            update_job_status(job)

        return job

    def update(self, instance, validated_data):
        instance.service_category = validated_data.get('service_category', instance.service_category)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()
        return instance


class ServiceRateSerializer(serializers.ModelSerializer):
    product = ProductJobItemLiteSerializer(read_only=True)
    service_category = serializers.CharField(source='service_category.name', read_only=True)
    service_category_display = serializers.CharField(source='service_category.display_name', read_only=True)
    rate_per_unit = serializers.FloatField()

    class Meta:
        model = ServiceRate
        fields = ['id', 'product', 'service_category', 'service_category_display', 'rate_per_unit']


class RateDetailSerializer(serializers.Serializer):
    """Describes the rates for a specific size."""
    size = serializers.CharField()
    Drawing = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Carving = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Cutting = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Gouging = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Sanding = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Painting = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    Finishing = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

class HierarchicalServiceRateSerializer(serializers.Serializer):
    """Describes a product with its animal type and a list of rates for different sizes."""
    product_category = serializers.CharField()
    animal = serializers.CharField()
    rates = RateDetailSerializer(many=True)

class JobTransactionSerializer(serializers.ModelSerializer):
    """Serializer for JobTransaction model."""
    class Meta:
        model = JobTransaction
        fields = ['id', 'job', 'product', 'from_stage', 'to_stage', 'quantity', 'timestamp']