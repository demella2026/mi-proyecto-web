"""
Configuracion del DefaultRouter de DRF.
Genera automaticamente todas las rutas CRUD para cada ViewSet.
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
router.register(r"sistemas-operativos", views.SistemaOperativoViewSet)
router.register(r"software", views.SoftwareViewSet)
router.register(r"computadores", views.ComputadorViewSet)
router.register(r"celulares", views.CelularViewSet)
router.register(r"monitores", views.MonitorViewSet)
router.register(r"computador-software", views.ComputadorSoftwareViewSet)
router.register(r"areas", views.AreaViewSet)
router.register(r"centros-costo", views.CentroCostoViewSet)
router.register(r"empleados", views.EmpleadoViewSet)
router.register(r"chips", views.ChipViewSet)
router.register(r"usuarios", views.UsuarioViewSet)
router.register(r"solicitudes-correo", views.SolicitudCorreoViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.dashboard_stats, name="dashboard-stats"),
    path("historial/", views.historial_global, name="historial-global"),
]
