"""
Serializadores para la sincronizacion LDAP.
"""

from rest_framework import serializers
from .models import SyncLog, LDAPMapping


class SyncLogSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = SyncLog
        fields = [
            "id", "fecha", "estado", "estado_display",
            "empleados_creados", "empleados_actualizados",
            "empleados_desactivados", "errores",
            "duracion_segundos", "ejecutado_por",
        ]


class LDAPMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = LDAPMapping
        fields = ["id", "atributo_ldap", "campo_empleado", "activo"]


class SyncTriggerSerializer(serializers.Serializer):
    """Serializador para disparar una sincronizacion manual."""
    desactivar_ausentes = serializers.BooleanField(default=False)
    dry_run = serializers.BooleanField(default=False)
