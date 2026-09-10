# products/serializers.py
from rest_framework import serializers
from .models import Product, PriceHistory, ProductType, SizeCategory, ServiceCategory
from datetime import date
from django.utils import timezone
from django.db import models


# --- Lookup Serializers ---

class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ['id', 'name', 'display_name']


class SizeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeCategory
        fields = ['id', 'name', 'display_name']


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'display_name']


# --- Product Serializers ---

class ProductLiteSerializer(serializers.ModelSerializer):
    """Lite serializer for nested Product details in PriceHistory."""
    product_type = serializers.CharField(source='product_type.name', read_only=True)
    product_type_display = serializers.CharField(source='product_type.display_name', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'product_type', 'product_type_display', 'animal_type']


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for basic Product listing."""
    product_type = serializers.CharField(source='product_type.name', read_only=True)
    product_type_id = serializers.IntegerField(source='product_type.id', read_only=True)
    product_type_display = serializers.CharField(source='product_type.display_name', read_only=True)
    size_category = serializers.CharField(source='size_category.name', read_only=True, allow_null=True)
    size_category_id = serializers.IntegerField(source='size_category.id', read_only=True, allow_null=True)
    size_category_display = serializers.CharField(source='size_category.display_name', read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id', 'product_type', 'product_type_id', 'product_type_display', 'animal_type',
            'size_category', 'size_category_id',
            'size_category_display', 'base_price', 'is_active', 'last_price_update', 'unit_of_measure'
        ]
        read_only_fields = ['last_price_update']


class ProductDetailSerializer(ProductSerializer):
    """Serializer for retrieving a single Product's full details."""
    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating Products."""
    product_type = serializers.CharField(required=True)
    size_category = serializers.CharField(required=False, allow_null=True, allow_blank=True)

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

    def validate_product_type(self, value):
        if not value:
            raise serializers.ValidationError("Product type is required.")
        if str(value).isdigit():
            try:
                return ProductType.objects.get(id=int(value))
            except ProductType.DoesNotExist:
                raise serializers.ValidationError(f"ProductType with ID {value} does not exist.")
        try:
            return ProductType.objects.get(name=value)
        except ProductType.DoesNotExist:
            pt = ProductType.objects.filter(display_name__iexact=value).first()
            if pt:
                return pt
            raise serializers.ValidationError(f"ProductType '{value}' does not exist.")

    def validate_size_category(self, value):
        if not value:
            return None
        if str(value).isdigit():
            try:
                return SizeCategory.objects.get(id=int(value))
            except SizeCategory.DoesNotExist:
                raise serializers.ValidationError(f"SizeCategory with ID {value} does not exist.")
        try:
            return SizeCategory.objects.get(name=value)
        except SizeCategory.DoesNotExist:
            sc = SizeCategory.objects.filter(display_name__iexact=value).first()
            if sc:
                return sc
            raise serializers.ValidationError(f"SizeCategory '{value}' does not exist.")

    def validate_base_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Base price cannot be negative.")
        return value

    def validate(self, data):
        queryset = Product.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        product_type = data.get('product_type', self.instance.product_type if self.instance else None)
        animal_type = data.get('animal_type', self.instance.animal_type if self.instance else None)
        size_category = data.get('size_category', self.instance.size_category if self.instance else None)

        if queryset.filter(
            product_type=product_type,
            animal_type=animal_type,
            size_category=size_category
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