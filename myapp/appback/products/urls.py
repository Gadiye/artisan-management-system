from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    PriceHistoryViewSet,
    ProductTypeViewSet,
    SizeCategoryViewSet,
    ServiceCategoryViewSet,
    get_price,
)

router = DefaultRouter()
router.register(r'product-types', ProductTypeViewSet, basename='producttype')
router.register(r'size-categories', SizeCategoryViewSet, basename='sizecategory')
router.register(r'service-categories', ServiceCategoryViewSet, basename='servicecategory')
router.register(r'price-history', PriceHistoryViewSet, basename='pricehistory')
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('get_price/', get_price, name='get_price'),
    path('', include(router.urls)),
]
