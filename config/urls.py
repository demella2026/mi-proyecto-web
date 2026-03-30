from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view


@api_view(["GET"])
def api_root(request):
    """Endpoint raíz con información de la API."""
    return Response({
        "mensaje": "API de Inventario TI",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "api_inventario": "/api/v1/",
        }
    })


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("inventory.urls")),
    path('api/', include('auditlog.urls')),       # ← NUEVO
    path('api/exports/', include('exports.urls')), # ← NUEVO
]