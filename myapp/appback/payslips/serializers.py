# payslips/serializers.py
from rest_framework import serializers
from .models import Payslip, ServiceRate
from artisans.models import Artisan # Assuming Artisan is in 'artisans' app
from jobs.models import JobItem     # Assuming JobItem is in 'jobs' app
from products.models import Product # Assuming Product is in 'products' app

import base64
from django.core.files.base import ContentFile
from django.conf import settings
import os
from django.db import transaction
from django.utils import timezone


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
        fields = ['id', 'product_type', 'animal_type', 'base_price'] # Added base_price for payslip details


class JobForPayslipSerializer(serializers.ModelSerializer):
    """
    Lite serializer for nested Job details, specifically for job_id.
    """
    class Meta:
        model = JobItem.job.field.model # Get the Job model from the JobItem's job field
        fields = ['job_id', 'service_category'] # Assuming Job model has a 'job_id' field


class JobItemForPayslipSerializer(serializers.ModelSerializer):
    """
    Serializer for JobItem when nested within Payslip details.
    """
    job = JobForPayslipSerializer(read_only=True) # Use the lite job serializer
    product = ProductLiteSerializer(read_only=True)

    class Meta:
        model = JobItem
        fields = ['id', 'job', 'product', 'quantity_ordered', 'quantity_accepted', 'final_payment']


class PayslipListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing Payslips.
    """
    artisan = ArtisanLiteSerializer(read_only=True)
    pdf_file_url = serializers.SerializerMethodField()
    service_category_display = serializers.CharField(source='get_service_category_display', read_only=True)


    class Meta:
        model = Payslip
        fields = [
            'id', 'artisan', 'service_category', 'service_category_display', 'generated_date', 'total_payment', 'pdf_file_url'
        ]
        read_only_fields = ['generated_date'] # total_payment can be provided or calculated

    def get_pdf_file_url(self, obj):
        if obj.pdf_file:
            # Ensure proper URL for media files
            return self.context['request'].build_absolute_uri(obj.pdf_file.url)
        return None

class PayslipDetailSerializer(PayslipListSerializer):
    """
    Serializer for retrieving a single Payslip, with optional nested job items.
    """
    job_items = serializers.SerializerMethodField() # For conditional inclusion

    class Meta(PayslipListSerializer.Meta):
        fields = PayslipListSerializer.Meta.fields + ['job_items']

    def get_job_items(self, obj):
        # Only include job items if 'include_job_items' param is true in context
        if self.context.get('include_job_items', False):
            # Fetch JobItems that were part of this payslip generation.
            # This logic assumes that Payslip's creation process correctly marks JobItems
            # for that artisan, service_category, and period.
            # A more robust solution might link Payslip to JobItem directly (ManyToMany).
            # For now, we infer based on payslip_generated and date range for the artisan.
            queryset = JobItem.objects.filter(
                artisan=obj.artisan,
                # Use obj.generated_date for accuracy if JobItem has a generated_date,
                # or rely on the period_start/end of the payslip itself
                job__created_date__date__gte=obj.period_start,
                job__created_date__date__lte=obj.period_end,
                payslip_generated=True, # Important: Only show items explicitly marked
                # If service_category is relevant, add: job__service_category=obj.service_category
            ).select_related('job', 'product')
            return JobItemForPayslipSerializer(queryset, many=True).data
        return []


class PayslipCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating Payslips.
    Handles PDF file upload (Base64 or Multipart) and JobItem ID marking.
    """
    artisan = serializers.PrimaryKeyRelatedField(queryset=Artisan.objects.all())
    # pdf_file can be a Base64 string for direct upload or a standard Django File object
    # For DRF, if using multipart/form-data, 'pdf_file' will be a File object directly.
    # If using application/json and base64, you'll need this CharField + custom write logic.
    pdf_file = serializers.FileField(write_only=True, required=False, allow_null=True) # Use FileField for direct upload
    pdf_file_base64 = serializers.CharField(write_only=True, required=False, allow_null=True) # For base64 input

    job_item_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    pdf_file_url = serializers.SerializerMethodField(read_only=True)
    generated_date = serializers.DateTimeField(read_only=True) # Should be auto_now_add

    class Meta:
        model = Payslip
        fields = [
            'id', 'artisan', 'service_category', 'total_payment',
            'period_start', 'period_end', 'pdf_file', 'pdf_file_base64', # Added pdf_file_base64
            'job_item_ids', 'generated_date', 'pdf_file_url'
        ]
        # total_payment can be manually provided, or calculated by the generate endpoint
        extra_kwargs = {
            'service_category': {'required': True, 'allow_null': False, 'allow_blank': False}
        }

    def get_pdf_file_url(self, obj):
        if obj.pdf_file:
            return self.context['request'].build_absolute_uri(obj.pdf_file.url)
        return None

    def validate_service_category(self, value):
        if value not in [choice[0] for choice in Product.SERVICE_CATEGORIES]:
            raise serializers.ValidationError("Invalid service category.")
        return value

    def validate(self, data):
        # Validate that period_start is before or equal to period_end
        if 'period_start' in data and 'period_end' in data:
            if data['period_start'] > data['period_end']:
                raise serializers.ValidationError("Period start date cannot be after period end date.")

        # Ensure either pdf_file or pdf_file_base64 is provided if required for creation
        # (This serializer is also used for 'generate' which auto-creates PDF)
        # For direct POST to /api/payslips/, at least one file method should be used
        if self.context['request'].method == 'POST' and not self.instance: # For create operation
            if not data.get('pdf_file') and not data.get('pdf_file_base64'):
                # Only require if it's not the 'generate' action that will handle PDF
                # This check might need refinement based on how 'generate' interacts.
                # For now, let's assume pdf is optional if total_payment is manually provided.
                pass # PDF file is optional if total_payment is explicitly set for manual payslip entry

        return data

    def _save_pdf_file(self, instance, pdf_data_content):
        # Ensure proper directory structure for upload_to='payslips/'
        # The `name` argument for `ContentFile` or `FileField.save` is important.
        if pdf_data_content:
            filename = f"payslip_{instance.artisan.name.replace(' ', '_')}_{instance.period_start}_{instance.period_end}_{instance.pk}_{timezone.now().strftime('%f')}.pdf"
            instance.pdf_file.save(filename, pdf_data_content, save=False) # save=False to avoid double save

    def create(self, validated_data):
        job_item_ids = validated_data.pop('job_item_ids', [])
        pdf_file_direct = validated_data.pop('pdf_file', None)
        pdf_file_base64 = validated_data.pop('pdf_file_base64', None)

        # Create the Payslip instance without the PDF file initially
        # generated_date is auto_now_add=True, so no need to set it here
        payslip = Payslip.objects.create(**validated_data)

        pdf_data_content = None
        if pdf_file_direct: # This is for multipart/form-data upload
            pdf_data_content = pdf_file_direct
        elif pdf_file_base64: # This is for base64 encoded string in JSON
            try:
                format, b64str = pdf_file_base64.split(';base64,')
                if not format.lower().endswith('/pdf'):
                    raise serializers.ValidationError("Only PDF files are allowed for payslip upload (base64).")
                pdf_data_content = ContentFile(base64.b64decode(b64str), name="temp_payslip.pdf")
            except (ValueError, IndexError):
                raise serializers.ValidationError("Invalid base64 PDF data format.")

        # Handle PDF file saving after instance is created to get PK for filename
        if pdf_data_content:
            self._save_pdf_file(payslip, pdf_data_content)
            payslip.save(update_fields=['pdf_file']) # Save the file field

        # Update JobItem payslip_generated status within a transaction
        if job_item_ids:
            with transaction.atomic():
                # Ensure job items belong to the same artisan and are within the payslip period
                # (You might refine this check further, e.g., if total_payment must match sum of job_items)
                valid_job_items = JobItem.objects.filter(
                    id__in=job_item_ids,
                    artisan=payslip.artisan,
                    job__created_date__date__gte=payslip.period_start,
                    job__created_date__date__lte=payslip.period_end,
                    payslip_generated=False # Only mark those not already generated
                )
                valid_job_items.update(payslip_generated=True)

        return payslip

    def update(self, instance, validated_data):
        # Prevent updating artisan
        if 'artisan' in validated_data and validated_data['artisan'] != instance.artisan:
            raise serializers.ValidationError({"artisan": "Artisan cannot be changed for an existing payslip."})

        job_item_ids_new = validated_data.pop('job_item_ids', None)
        pdf_file_direct = validated_data.pop('pdf_file', None)
        pdf_file_base64 = validated_data.pop('pdf_file_base64', None)

        # Update core Payslip fields
        instance.service_category = validated_data.get('service_category', instance.service_category)
        instance.total_payment = validated_data.get('total_payment', instance.total_payment)
        instance.period_start = validated_data.get('period_start', instance.period_start)
        instance.period_end = validated_data.get('period_end', instance.period_end)

        # Handle PDF file update/replacement
        pdf_data_content = None
        if pdf_file_direct: # Direct file upload (multipart)
            pdf_data_content = pdf_file_direct
        elif pdf_file_base64: # Base64 string in JSON
            try:
                format, b64str = pdf_file_base64.split(';base64,')
                if not format.lower().endswith('/pdf'):
                    raise serializers.ValidationError("Only PDF files are allowed for payslip upload (base64).")
                pdf_data_content = ContentFile(base64.b64decode(b64str), name="temp_payslip.pdf")
            except (ValueError, IndexError):
                raise serializers.ValidationError("Invalid base64 PDF data format.")
        elif 'pdf_file' in self.initial_data and self.initial_data['pdf_file'] == '':
            # This handles case where frontend sends "pdf_file": null or empty string to clear the file
            pdf_data_content = None # Signal to clear the file

        if pdf_data_content is not None:
            if instance.pdf_file: # Delete old file if exists
                instance.pdf_file.delete(save=False) # Delete from storage
            if pdf_data_content: # Save new file if provided
                self._save_pdf_file(instance, pdf_data_content)
            else: # If pdf_data_content is None (explicit clear)
                instance.pdf_file = None
        elif 'pdf_file_base64' in self.initial_data and self.initial_data['pdf_file_base64'] == '':
            # Handle base64 explicit clear
            if instance.pdf_file:
                instance.pdf_file.delete(save=False)
            instance.pdf_file = None


        instance.save() # Save the Payslip instance and its updated pdf_file path

        # Handle JobItem updates (more complex logic for adding/removing)
        if job_item_ids_new is not None: # If job_item_ids was provided in the request
            with transaction.atomic():
                # Get all job items currently marked as generated for this payslip's artisan and period
                current_marked_job_items = JobItem.objects.filter(
                    artisan=instance.artisan,
                    job__created_date__date__gte=instance.period_start,
                    job__created_date__date__lte=instance.period_end,
                    payslip_generated=True
                )
                current_marked_job_item_ids = set(current_marked_job_items.values_list('id', flat=True))
                new_job_item_ids_set = set(job_item_ids_new)

                # Items to unset (were marked, but not in the new list)
                items_to_unset = current_marked_job_item_ids - new_job_item_ids_set
                if items_to_unset:
                    JobItem.objects.filter(id__in=items_to_unset, artisan=instance.artisan).update(payslip_generated=False)

                # Items to set (are in new list, but were not marked)
                items_to_set = new_job_item_ids_set - current_marked_job_item_ids
                if items_to_set:
                     # Validate that these items belong to the artisan and period
                     JobItem.objects.filter(
                         id__in=items_to_set,
                         artisan=instance.artisan,
                         job__created_date__date__gte=instance.period_start,
                         job__created_date__date__lte=instance.period_end
                     ).update(payslip_generated=True) # Only update if they match criteria

        return instance


class ServiceRateSerializer(serializers.ModelSerializer):
    product = ProductLiteSerializer(read_only=True)

    class Meta:
        model = ServiceRate
        fields = ['id', 'product', 'service_category', 'rate_per_unit', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
