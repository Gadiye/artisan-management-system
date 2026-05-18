from rest_framework import serializers
from django.core.validators import RegexValidator
from django.db import models
import re

from .models import Artisan
from jobs.models import JobItem, Job
from financials.models import Payslip


class ArtisanWithPendingPaymentSerializer(serializers.ModelSerializer):
    pending_payment_total = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = Artisan
        fields = ['id', 'name', 'pending_payment_total']


class JobItemForPendingPaymentSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()

    class Meta:
        model = JobItem
        fields = ['id', 'product', 'quantity_accepted', 'final_payment']

    def get_product(self, obj):
        return {
            'product_type': obj.product.product_type,
            'animal_type': obj.product.animal_type,
        }

class JobWithPendingPaymentSerializer(serializers.ModelSerializer):
    pending_payment = serializers.DecimalField(max_digits=10, decimal_places=2)
    items = JobItemForPendingPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Job
        fields = ['job_id', 'created_date', 'status', 'service_category', 'pending_payment', 'items']


class ArtisanListSerializer(serializers.ModelSerializer):
    """
    A lightweight serializer for the Artisan list view, providing only essential information.
    """
    class Meta:
        model = Artisan
        fields = ['id', 'name', 'phone', 'is_active', 'created_date']


class JobSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for job information in artisan details.
    """
    job_id = serializers.IntegerField(source='job.id', read_only=True)
    status = serializers.CharField(source='job.status', read_only=True)
    service_category = serializers.CharField(source='job.service_category', read_only=True)
    created_date = serializers.DateTimeField(source='job.created_date', read_only=True)
    
    class Meta:
        model = JobItem
        fields = ['job_id', 'status', 'service_category', 'created_date']


class PayslipSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for payslip information in artisan details.
    """
    
    class Meta:
        model = Payslip
        fields = ['id', 'generated_date', 'total_payment', 'period_start', 'period_end']


class ArtisanDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Artisan model.
    Includes related jobs and payslips when requested.
    """
    
    jobs = serializers.SerializerMethodField()
    payslips = serializers.SerializerMethodField()
    
    # Include all the computed fields
    totalJobs = serializers.SerializerMethodField()
    totalEarnings = serializers.SerializerMethodField()
    specialties = serializers.SerializerMethodField()
    lastJobDate = serializers.SerializerMethodField()
    pendingPayment = serializers.SerializerMethodField()
    averageRating = serializers.SerializerMethodField()
    createdDate = serializers.DateTimeField(source='created_date', read_only=True)
    
    class Meta:
        model = Artisan
        fields = [
            'id', 'name', 'phone', 'is_active', 'created_date', 'createdDate',
            'totalJobs', 'totalEarnings', 'specialties', 'lastJobDate', 
            'pendingPayment', 'averageRating', 'jobs', 'payslips'
        ]
        read_only_fields = [
            'id', 'created_date', 'createdDate', 'totalJobs', 'totalEarnings', 
            'specialties', 'lastJobDate', 'pendingPayment', 'averageRating', 'jobs', 'payslips'
        ]
    
    def get_totalJobs(self, obj):
        return obj.total_jobs_computed
    
    def get_totalEarnings(self, obj):
        return obj.total_earnings_computed
    
    def get_specialties(self, obj):
        return obj.specialties_computed
    
    def get_lastJobDate(self, obj):
        return obj.last_job_date_computed
    
    def get_pendingPayment(self, obj):
        return obj.pending_payment_computed
    
    def get_averageRating(self, obj):
        return round(obj.average_rating_computed, 1)
    
    def get_jobs(self, obj):
        """
        Return job summary if requested, otherwise None.
        """
        if hasattr(obj, 'prefetch_jobs') and obj.prefetch_jobs:
            job_items = JobItem.objects.filter(artisan=obj).select_related('job')[:10]
            return JobSummarySerializer(job_items, many=True).data
        return None
    
    def get_payslips(self, obj):
        """
        Return payslip summary if requested, otherwise None.
        """
        if hasattr(obj, 'prefetch_payslips') and obj.prefetch_payslips:
            payslips = Payslip.objects.filter(artisan=obj).order_by('-generated_date')[:10]
            return PayslipSummarySerializer(payslips, many=True).data
        return None


class JobItemSerializer(serializers.ModelSerializer):
    """
    Serializer for JobItem model when viewed from artisan context.
    """
    job_id = serializers.IntegerField(source='job.id', read_only=True)
    status = serializers.CharField(source='job.status', read_only=True)
    service_category = serializers.CharField(source='job.service_category', read_only=True)
    created_date = serializers.DateTimeField(source='job.created_date', read_only=True)
    customer_name = serializers.CharField(source='job.customer.name', read_only=True)
    description = serializers.CharField(source='job.description', read_only=True)
    
    class Meta:
        model = JobItem
        fields = [
            'id', 'job_id', 'status', 'service_category', 
            'created_date', 'customer_name', 'description',
            'quantity', 'unit_price', 'total_price'
        ]


class PayslipSerializer(serializers.ModelSerializer):
    """
    Serializer for Payslip model when viewed from artisan context.
    """
    artisan_name = serializers.CharField(source='artisan.name', read_only=True)
    
    class Meta:
        model = Payslip
        fields = [
            'id', 'artisan_name', 'generated_date', 'total_payment',
            'period_start', 'period_end', 'notes'
        ]


class ArtisanCreateSerializer(serializers.ModelSerializer):
    """
    Specialized serializer for creating artisans with enhanced validation.
    """
    
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    
    phone = serializers.CharField(
        validators=[phone_validator],
        required=False,
        allow_blank=True,
        help_text="Phone number in international format"
    )
    
    class Meta:
        model = Artisan
        fields = ['name', 'phone', 'is_active']
    
    def validate(self, data):
        """
        Validate that artisan name is unique among active artisans.
        """
        name = data.get('name', '').strip()
        if name:
            # Check for existing active artisan with same name
            existing = Artisan.objects.filter(
                name__iexact=name, 
                is_active=True
            ).exists()
            
            if existing:
                raise serializers.ValidationError({
                    'name': 'An active artisan with this name already exists.'
                })
        
        return data
    
    def create(self, validated_data):
        """
        Create artisan with default active status.
        """
        validated_data.setdefault('is_active', True)
        return super().create(validated_data)


class ArtisanUpdateSerializer(serializers.ModelSerializer):
    """
    Specialized serializer for updating artisans.
    """
    
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    
    phone = serializers.CharField(
        validators=[phone_validator],
        required=False,
        allow_blank=True,
        help_text="Phone number in international format"
    )
    
    class Meta:
        model = Artisan
        fields = ['name', 'phone', 'is_active']
    
    def validate_name(self, value):
        """
        Validate name change doesn't conflict with existing active artisans.
        """
        if value:
            name = value.strip()
            # Check for existing active artisan with same name (excluding current instance)
            existing = Artisan.objects.filter(
                name__iexact=name, 
                is_active=True
            ).exclude(id=self.instance.id).exists()
            
            if existing:
                raise serializers.ValidationError(
                    'An active artisan with this name already exists.'
                )
        
        return value
    
    def validate_is_active(self, value):
        """
        Validate that artisan can be deactivated (no active jobs).
        """
        if not value and self.instance.is_active:
            # Check for active jobs before allowing deactivation
            active_jobs = JobItem.objects.filter(
                artisan=self.instance, 
                job___status='IN_PROGRESS'
            ).exists()
            
            if active_jobs:
                raise serializers.ValidationError(
                    'Cannot deactivate artisan with active job items.'
                )
        
        return value
