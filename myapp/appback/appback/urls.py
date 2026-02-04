"""
URL configuration for appback project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from jobs.urls import standalone_router # Import the standalone_router
from .views import json_login

def api_root(request):
    return JsonResponse({
        "message": "API is working",
        "version": "1.0",
        "endpoints": {
            "products": "/api/products/",
            "artisans": "/api/artisans/",
            "customers": "/api/customers/",
            "jobs": "/api/jobs/",
            "inventory": "/api/inventory/",
            "orders": "/api/orders/",
            "financials": "/api/financials/",
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root),  # Root API endpoint
    path('api/products/', include('products.urls')),
    path('api/artisans/', include('artisans.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/financials/', include('financials.urls')),
    path('api/login/', json_login, name='json_login'),
    
    path('api/', include(standalone_router.urls)),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
