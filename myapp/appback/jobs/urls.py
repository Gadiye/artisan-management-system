# jobs/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, JobItemViewSet, JobDeliveryViewSet, ServiceRateViewSet

# Create routers for standalone viewsets
standalone_router = DefaultRouter()
standalone_router.register(r'job-items', JobItemViewSet, basename='jobitem')
standalone_router.register(r'job-deliveries', JobDeliveryViewSet, basename='jobdelivery')
standalone_router.register(r'service-rates', ServiceRateViewSet, basename='servicerates')

# Explicitly define JobViewSet URLs instead of using a router for it
urlpatterns = [
    # Main JobViewSet routes
    path('', JobViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-list-create'),
    path('dashboard/', JobViewSet.as_view({'get': 'dashboard'}), name='job-dashboard'),
    path('production-guide/', JobViewSet.as_view({'get': 'production_guide'}), name='job-production-guide'),
    path('comprehensive-reports/', JobViewSet.as_view({'get': 'comprehensive_reports'}), name='job-comprehensive-reports'),
    path('<str:job_id>/', JobViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='job-detail'),

    # Job Items nested routes
    path('<str:job_id>/items/', JobViewSet.as_view({'get': 'list_job_items', 'post': 'create_job_item'}), name='job-items-list'),
    path('<str:job_id>/items/<int:item_pk>/', JobViewSet.as_view({
        'get': 'retrieve_job_item',
        'put': 'update_job_item',
        'patch': 'update_job_item',
        'delete': 'destroy_job_item'
    }), name='job-item-detail'),
    path('<str:job_id>/items/<int:item_pk>/reset-payslip/', JobViewSet.as_view({'post': 'reset_job_item_payslip'}), name='job-item-reset-payslip'),
    
    # JobDelivery nested routes
    path('<str:job_id>/items/<int:item_pk>/deliveries/', JobViewSet.as_view({
        'get': 'list_job_item_deliveries',
        'post': 'create_job_item_delivery'
    }), name='job-item-deliveries-list'),
    path('<str:job_id>/items/<int:item_pk>/deliveries/<int:delivery_pk>/', JobViewSet.as_view({
        'get': 'retrieve_job_item_delivery',
        'put': 'update_job_item_delivery',
        'patch': 'update_job_item_delivery',
        'delete': 'destroy_job_item_delivery'
    }), name='job-item-delivery-detail'),
    
    # Job summary route
    path('<str:job_id>/summary/', JobViewSet.as_view({'get': 'job_summary'}), name='job-summary'),
]