from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"mantenimientos", views.MantenimientoViewSet)
router.register(r"archivos-mantenimiento", views.ArchivoMantenimientoViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
