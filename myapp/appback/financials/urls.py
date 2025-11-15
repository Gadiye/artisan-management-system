# financials/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PayslipViewSet, ServiceRateViewSet, ArtisanAdvanceViewSet, AdvanceDeductionViewSet

router = DefaultRouter()
router.register(r'payslips', PayslipViewSet, basename='payslip')
router.register(r'service-rates', ServiceRateViewSet, basename='service-rate')
router.register(r'advances', ArtisanAdvanceViewSet, basename='artisan-advance')
router.register(r'advance-deductions', AdvanceDeductionViewSet, basename='advance-deduction')

urlpatterns = [
    path('', include(router.urls)),
]
