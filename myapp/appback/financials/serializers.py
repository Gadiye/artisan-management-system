# financials/serializers.py
from rest_framework import serializers
from .models import Payslip, ServiceRate, ArtisanAdvance, AdvanceDeduction
from artisans.models import Artisan
from jobs.models import JobItem
from products.models import Product

import base64
from django.core.files.base import ContentFile
from django.conf import settings
import os
from django.db import transaction
from django.utils import timezone


class AdvanceDeductionForPayslipSerializer(serializers.ModelSerializer):
    """Serializer for AdvanceDeduction when nested within Payslip details."""
    class Meta:
        model = AdvanceDeduction
        fields = ['id', 'advance', 'amount', 'date_deducted']


class PayslipGenerateSerializer(serializers.Serializer):
    """
    Serializer for the payslip generation action.
    Validates input for generating payslips, accepting either artisan_id or service_category.
    """
    artisan_id = serializers.IntegerField(required=False)
    service_category = serializers.CharField(required=False)
    period_start = serializers.DateField()
    period_end = serializers.DateField()

    def validate(self, data):
        artisan_id = data.get('artisan_id')
        service_category = data.get('service_category')

        if not artisan_id and not service_category:
            raise serializers.ValidationError("Either 'artisan_id' or 'service_category' must be provided.")

        if artisan_id and service_category:
            raise serializers.ValidationError("Provide either 'artisan_id' or 'service_category', but not both.")

        if 'period_start' in data and 'period_end' in data:
            if data['period_start'] > data['period_end']:
                raise serializers.ValidationError("Period start date cannot be after period end date.")

        return data


class ArtisanLiteSerializer(serializers.ModelSerializer):
    """
    Lite serializer for nested Artisan details.
    """
    class Meta:
        model = Artisan
        fields = ['id', 'name']

class ProductLiteSerializer(serializers.ModelSerializer):
    """
    Lite serializer for nested Product details.
    """
    class Meta:
        model = Product
        fields = ['id', 'product_type', 'animal_type', 'base_price']


class JobForPayslipSerializer(serializers.ModelSerializer):
    """
    Lite serializer for nested Job details, specifically for job_id.
    """
    class Meta:
        model = JobItem.job.field.model
        fields = ['job_id', 'service_category']


class JobItemForPayslipSerializer(serializers.ModelSerializer):
    """
    Serializer for JobItem when nested within Payslip details.
    """
    job = JobForPayslipSerializer(read_only=True)
    product = ProductLiteSerializer(read_only=True)

    class Meta:
        model = JobItem
        fields = ['id', 'job', 'product', 'quantity_ordered', 'quantity_accepted', 'final_payment']


class PayslipListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing Payslips.
    """
    artisan = ArtisanLiteSerializer(read_only=True)
    service_category_display = serializers.CharField(source='get_service_category_display', read_only=True)
    total_advances_deducted = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)


    class Meta:
        model = Payslip
        fields = [
            'id', 'artisan', 'service_category', 'service_category_display', 'generated_date', 'total_payment', 'spreadsheet_file', 'total_advances_deducted', 'period_start', 'period_end'
        ]
        read_only_fields = ['generated_date']

class PayslipDetailSerializer(PayslipListSerializer):
    """
    Serializer for retrieving a single Payslip, with optional nested job items.
    """
    job_items = serializers.SerializerMethodField()
    advance_deductions = AdvanceDeductionForPayslipSerializer(many=True, read_only=True)

    class Meta(PayslipListSerializer.Meta):
        fields = PayslipListSerializer.Meta.fields + ['job_items', 'advance_deductions']

    def get_job_items(self, obj):
        if self.context.get('include_job_items', False):
            queryset = JobItem.objects.filter(
                artisan=obj.artisan,
                job__created_date__date__gte=obj.period_start,
                job__created_date__date__lte=obj.period_end,
                payslip_generated=True,
            ).select_related('job', 'product')
            return JobItemForPayslipSerializer(queryset, many=True).data
        return []


class PayslipCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating Payslips.
    """
    artisan = serializers.PrimaryKeyRelatedField(queryset=Artisan.objects.all())
    spreadsheet_file = serializers.FileField(write_only=True, required=False, allow_null=True)
    spreadsheet_file_base64 = serializers.CharField(write_only=True, required=False, allow_null=True)

    job_item_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    spreadsheet_file_url = serializers.SerializerMethodField(read_only=True)
    generated_date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Payslip
        fields = [
            'id', 'artisan', 'service_category', 'total_payment',
            'period_start', 'period_end', 'spreadsheet_file', 'spreadsheet_file_base64',
            'job_item_ids', 'generated_date', 'spreadsheet_file_url'
        ]
        extra_kwargs = {
            'service_category': {'required': True, 'allow_null': False, 'allow_blank': False}
        }

    def get_spreadsheet_file_url(self, obj):
        if obj.spreadsheet_file:
            return self.context['request'].build_absolute_uri(obj.spreadsheet_file.url)
        return None

    def validate_service_category(self, value):
        if value not in [choice[0] for choice in Product.SERVICE_CATEGORIES]:
            raise serializers.ValidationError("Invalid service category.")
        return value

    def validate(self, data):
        if 'period_start' in data and 'period_end' in data:
            if data['period_start'] > data['period_end']:
                raise serializers.ValidationError("Period start date cannot be after period end date.")

        if self.context['request'].method == 'POST' and not self.instance:
            if not data.get('spreadsheet_file') and not data.get('spreadsheet_file_base64'):
                pass

        return data

    def _save_spreadsheet_file(self, instance, spreadsheet_data_content):
        if spreadsheet_data_content:
            filename = f"payslip_{instance.artisan.name.replace(' ', '_')}_{instance.period_start}_{instance.period_end}_{instance.pk}_{timezone.now().strftime('%f')}.xlsx"
            instance.spreadsheet_file.save(filename, spreadsheet_data_content, save=False)

    def create(self, validated_data):
        job_item_ids = validated_data.pop('job_item_ids', [])
        spreadsheet_file_direct = validated_data.pop('spreadsheet_file', None)
        spreadsheet_file_base64 = validated_data.pop('spreadsheet_file_base64', None)

        payslip = Payslip.objects.create(**validated_data)

        spreadsheet_data_content = None
        if spreadsheet_file_direct:
            spreadsheet_data_content = spreadsheet_file_direct
        elif spreadsheet_file_base64:
            try:
                format, b64str = spreadsheet_file_base64.split(';base64,')
                if not format.lower().endswith('/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
                    raise serializers.ValidationError("Only XLSX files are allowed for payslip upload (base64).")
                spreadsheet_data_content = ContentFile(base64.b64decode(b64str), name="temp_payslip.xlsx")
            except (ValueError, IndexError):
                raise serializers.ValidationError("Invalid base64 XLSX data format.")

        if spreadsheet_data_content:
            self._save_spreadsheet_file(payslip, spreadsheet_data_content)
            payslip.save(update_fields=['spreadsheet_file'])

        if job_item_ids:
            with transaction.atomic():
                valid_job_items = JobItem.objects.filter(
                    id__in=job_item_ids,
                    artisan=payslip.artisan,
                    job__created_date__date__gte=payslip.period_start,
                    job__created_date__date__lte=payslip.period_end,
                    payslip_generated=False
                )
                valid_job_items.update(payslip_generated=True)

        return payslip

    def update(self, instance, validated_data):
        if 'artisan' in validated_data and validated_data['artisan'] != instance.artisan:
            raise serializers.ValidationError({"artisan": "Artisan cannot be changed for an existing payslip."})

        job_item_ids_new = validated_data.pop('job_item_ids', None)
        spreadsheet_file_direct = validated_data.pop('spreadsheet_file', None)
        spreadsheet_file_base64 = validated_data.pop('spreadsheet_file_base64', None)

        instance.service_category = validated_data.get('service_category', instance.service_category)
        instance.total_payment = validated_data.get('total_payment', instance.total_payment)
        instance.period_start = validated_data.get('period_start', instance.period_start)
        instance.period_end = validated_data.get('period_end', instance.period_end)

        spreadsheet_data_content = None
        if spreadsheet_file_direct:
            spreadsheet_data_content = spreadsheet_file_direct
        elif spreadsheet_file_base64:
            try:
                format, b64str = spreadsheet_file_base64.split(';base64,')
                if not format.lower().endswith('/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
                    raise serializers.ValidationError("Only XLSX files are allowed for payslip upload (base64).")
                spreadsheet_data_content = ContentFile(base64.b64decode(b64str), name="temp_payslip.xlsx")
            except (ValueError, IndexError):
                raise serializers.ValidationError("Invalid base64 XLSX data format.")
        elif 'spreadsheet_file' in self.initial_data and self.initial_data['spreadsheet_file'] == '':
            spreadsheet_data_content = None

        if spreadsheet_data_content is not None:
            if instance.spreadsheet_file:
                instance.spreadsheet_file.delete(save=False)
            if spreadsheet_data_content:
                self._save_spreadsheet_file(instance, spreadsheet_data_content)
            else:
                instance.spreadsheet_file = None
        elif 'spreadsheet_file_base64' in self.initial_data and self.initial_data['spreadsheet_file_base64'] == '':
            if instance.spreadsheet_file:
                instance.spreadsheet_file.delete(save=False)
            instance.spreadsheet_file = None


        instance.save()

        if job_item_ids_new is not None:
            with transaction.atomic():
                current_marked_job_items = JobItem.objects.filter(
                    artisan=instance.artisan,
                    job__created_date__date__gte=instance.period_start,
                    job__created_date__date__lte=instance.period_end,
                    payslip_generated=True
                )
                current_marked_job_item_ids = set(current_marked_job_items.values_list('id', flat=True))
                new_job_item_ids_set = set(job_item_ids_new)

                items_to_unset = current_marked_job_item_ids - new_job_item_ids_set
                if items_to_unset:
                    JobItem.objects.filter(id__in=items_to_unset, artisan=instance.artisan).update(payslip_generated=False)

                items_to_set = new_job_item_ids_set - current_marked_job_item_ids
                if items_to_set:
                     JobItem.objects.filter(
                         id__in=items_to_set,
                         artisan=instance.artisan,
                         job__created_date__date__gte=instance.period_start,
                         job__created_date__date__lte=instance.period_end
                     ).update(payslip_generated=True)

        return instance


class ServiceRateSerializer(serializers.ModelSerializer):
    product = ProductLiteSerializer(read_only=True)

    class Meta:
        model = ServiceRate
        fields = ['id', 'product', 'service_category', 'rate_per_unit', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class ArtisanAdvanceSerializer(serializers.ModelSerializer):
    """Serializer for ArtisanAdvance model."""
    class Meta:
        model = ArtisanAdvance
        fields = ['id', 'artisan', 'amount', 'date_given', 'reason', 'is_settled', 'balance']
        read_only_fields = ['date_given', 'is_settled', 'balance']

class AdvanceDeductionSerializer(serializers.ModelSerializer):
    """Serializer for AdvanceDeduction model."""
    class Meta:
        model = AdvanceDeduction
        fields = ['id', 'advance', 'payslip', 'amount', 'date_deducted']
        read_only_fields = ['date_deducted']
