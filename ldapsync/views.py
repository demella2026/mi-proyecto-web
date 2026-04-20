"""
Vistas de la API para la sincronizacion LDAP.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import SyncLog, LDAPMapping
from .serializers import SyncLogSerializer, LDAPMappingSerializer, SyncTriggerSerializer


class SyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Historial de sincronizaciones LDAP (solo lectura)."""
    queryset = SyncLog.objects.all()
    serializer_class = SyncLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["estado"]
    ordering_fields = ["fecha", "duracion_segundos"]


class LDAPMappingViewSet(viewsets.ModelViewSet):
    """CRUD de mapeos LDAP -> Empleado."""
    queryset = LDAPMapping.objects.all()
    serializer_class = LDAPMappingSerializer
    pagination_class = None


@api_view(["POST"])
def trigger_sync(request):
    """
    Dispara una sincronizacion manual con Active Directory.
    Ejecuta el management command sync_ldap_empleados en modo sincrono.
    """
    serializer = SyncTriggerSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    from django.core.management import call_command
    from io import StringIO

    out = StringIO()

    try:
        args = []
        if serializer.validated_data.get("dry_run"):
            args.append("--dry-run")
        if serializer.validated_data.get("desactivar_ausentes"):
            args.append("--desactivar-ausentes")

        call_command("sync_ldap_empleados", *args, stdout=out)

        return Response({
            "status": "ok",
            "output": out.getvalue(),
        })
    except Exception as e:
        return Response(
            {"status": "error", "error": str(e), "output": out.getvalue()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def ldap_status(request):
    """Retorna el estado de la configuracion y ultima sincronizacion LDAP."""
    from django.conf import settings

    server_uri = getattr(settings, "AUTH_LDAP_SERVER_URI", "No configurado")
    ldap_enabled = bool(
        server_uri and server_uri != "ldap://localhost:389"
    )

    last_sync = SyncLog.objects.first()
    last_sync_data = None
    if last_sync:
        last_sync_data = SyncLogSerializer(last_sync).data

    return Response({
        "ldap_habilitado": ldap_enabled,
        "servidor": server_uri if ldap_enabled else "No configurado",
        "ultima_sincronizacion": last_sync_data,
        "total_sincronizaciones": SyncLog.objects.count(),
    })
