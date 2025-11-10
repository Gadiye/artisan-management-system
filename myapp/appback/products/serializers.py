# products/serializers.py
from rest_framework import serializers
from .models import Product, PriceHistory
from datetime import date
from django.utils import timezone


# --- Product Serializers ---

class ProductLiteSerializer(serializers.ModelSerializer):
    """Lite serializer for nested Product details in PriceHistory."""
    class Meta:
        model = Product
        fields = ['id', 'product_type', 'animal_type']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for basic Product listing."""
    product_type_display = serializers.CharField(source='get_product_type_display', read_only=True)
    size_category_display = serializers.CharField(source='get_size_category_display', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'product_type', 'product_type_display', 'animal_type',
            'size_category',
            'size_category_display', 'base_price', 'is_active', 'last_price_update', 'unit_of_measure'
        ]
        read_only_fields = ['last_price_update']


class ProductDetailSerializer(ProductSerializer):
    """Serializer for retrieving a single Product's full details."""
    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating Products."""
    class Meta:
        model = Product
        fields = [
            'id', 'product_type', 'animal_type',
            'size_category', 'base_price', 'is_active'
        ]
        extra_kwargs = {
            'product_type': {'required': True},
            'animal_type': {'required': True},
            'base_price': {'required': True},
        }

    def validate_base_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Base price cannot be negative.")
        return value

    def validate(self, data):
        queryset = Product.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.filter(
            product_type=data.get('product_type', self.instance.product_type if self.instance else None),
            animal_type=data.get('animal_type', self.instance.animal_type if self.instance else None),
            size_category=data.get('size_category', self.instance.size_category if self.instance else None)
        ).exists():
            raise serializers.ValidationError(
                "A product with this combination of product type, animal type, and size already exists."
            )
        return data


# --- PriceHistory Serializers ---

class PriceHistoryListSerializer(serializers.ModelSerializer):
    """Serializer for listing PriceHistory records."""
    product = ProductLiteSerializer(read_only=True)

    class Meta:
        model = PriceHistory
        fields = [
            'id', 'product', 'old_price', 'new_price',
            'effective_date', 'changed_by', 'reason'
        ]
        read_only_fields = ['effective_date']


class PriceHistoryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating PriceHistory records."""
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    effective_date = serializers.DateTimeField(required=False, allow_null=True)
    changed_by = serializers.CharField(max_length=100, required=False, allow_blank=True)


    class Meta:
        model = PriceHistory
        fields = [
            'id', 'product', 'old_price', 'new_price',
            'effective_date', 'changed_by', 'reason'
        ]
        extra_kwargs = {
            'old_price': {'required': True, 'min_value': 0},
            'new_price': {'required': True, 'min_value': 0},
            'reason': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def validate(self, data):
        effective_date = data.get('effective_date')
        if effective_date and effective_date > timezone.now():
            raise serializers.ValidationError({"effective_date": "Effective date cannot be in the future."})

        if self.instance and 'product' in data and data['product'] != self.instance.product:
            raise serializers.ValidationError({"product": "Product cannot be changed for an existing price history record."})

        return data

    def create(self, validated_data):
        if 'effective_date' not in validated_data or validated_data['effective_date'] is None:
            validated_data['effective_date'] = timezone.now()
        if 'changed_by' not in validated_data or not validated_data['changed_by']:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                validated_data['changed_by'] = request.user.username
            else:
                validated_data['changed_by'] = 'system'

        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'changed_by' not in validated_data or not validated_data['changed_by']:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                validated_data['changed_by'] = request.user.username
            else:
                validated_data['changed_by'] = instance.changed_by

        return super().update(instance, validated_data)