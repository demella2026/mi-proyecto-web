from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RegistroCambioViewSet

router = DefaultRouter()
router.register(r'historial', RegistroCambioViewSet, basename='historial')

urlpatterns = [
    path('', include(router.urls)),
]