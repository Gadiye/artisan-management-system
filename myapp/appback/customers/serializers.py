from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re

from .models import Customer
from orders.serializers import OrderListSerializer  # Import from orders app


class CustomerBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Customer model, used for nested representations.
    """
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'is_active']


class CustomerSerializer(serializers.ModelSerializer):
    """
    Main serializer for the Customer model.
    Includes annotated fields from the ViewSet for efficiency.
    """
    total_orders = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    last_order_date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'address', 'is_active', 
            'created_date', 'total_orders', 'total_spent', 'last_order_date'
        ]
        read_only_fields = ['created_date']

    def validate_name(self, value):
        """Ensure name is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Name is required and cannot be empty.")
        return value.strip()

    def validate_email(self, value):
        """Validate email format using Django's built-in validator."""
        if value:
            try:
                validate_email(value)
            except ValidationError:
                raise serializers.ValidationError("Invalid email format.")
        return value

    def validate_phone(self, value):
        """Basic validation for phone number format."""
        if value and not re.match(r'^\+?[\d\s\-\(\)]{7,}$', value):
            raise serializers.ValidationError("Invalid phone number format.")
        return value


class CustomerWithOrdersSerializer(CustomerSerializer):
    """
    Extended customer serializer that includes a list of recent orders.
    """
    orders = OrderListSerializer(many=True, read_only=True, source='order_set')

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + ['orders']


class CustomerStatsSerializer(serializers.Serializer):
    """
    Serializer for aggregated customer statistics.
    """
    total_customers = serializers.IntegerField()
    active_customers = serializers.IntegerField()
    inactive_customers = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_orders = serializers.IntegerField()
    avg_order_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    new_customers_this_month = serializers.IntegerField()
