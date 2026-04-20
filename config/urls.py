from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import InventarioTokenView


@api_view(["GET"])
def api_root(request):
    """Endpoint raiz con informacion de la API."""
    return Response({
        "mensaje": "API de Inventario TI",
        "version": "2.0.0",
        "endpoints": {
            "admin": "/admin/",
            "api_inventario": "/api/v1/",
            "api_mantenimiento": "/api/v1/mantenimiento/",
            "api_actas": "/api/v1/actas/",
            "api_ldap": "/api/v1/ldap/",
        }
    })


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    # ── Auth JWT ──────────────────────────────────────────────
    path("api/v1/auth/token/",   InventarioTokenView.as_view(),  name="token-obtain"),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(),     name="token-refresh"),
    # ── API ───────────────────────────────────────────────────
    path("api/v1/", include("inventory.urls")),
    path("api/", include("auditlog.urls")),
    path("api/exports/", include("exports.urls")),
    path("api/v1/mantenimiento/", include("mantenimiento.urls")),
    path("api/v1/actas/", include("actas.urls")),
    path("api/v1/ldap/", include("ldapsync.urls")),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)