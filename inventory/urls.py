"""
Configuración del DefaultRouter de DRF.
Genera automáticamente todas las rutas CRUD para cada ViewSet.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"marcas", views.MarcaViewSet)
router.register(r"modelos", views.ModeloViewSet)
router.register(r"procesadores", views.ProcesadorViewSet)
router.register(r"ram", views.RamViewSet)
router.register(r"almacenamientos", views.AlmacenamientoViewSet)
router.register(r"laptops", views.LaptopViewSet)
router.register(r"celulares", views.CelularViewSet)
router.register(r"areas", views.AreaViewSet)
router.register(r"empleados", views.EmpleadoViewSet)    

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.dashboard_stats, name="dashboard-stats"),
    path("historial/", views.historial_global, name="historial-global"),
]