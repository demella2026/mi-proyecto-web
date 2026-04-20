from django.contrib import admin
from .models import ActaEntrega


@admin.register(ActaEntrega)
class ActaEntregaAdmin(admin.ModelAdmin):
    list_display = [
        "numero_acta", "tipo_acta", "estado", "empleado",
        "content_type", "object_id", "fecha_creacion", "fecha_firma",
    ]
    list_filter = ["tipo_acta", "estado", "content_type", "fecha_creacion"]
    search_fields = ["numero_acta", "empleado__nombre", "observaciones"]
    date_hierarchy = "fecha_creacion"
    readonly_fields = [
        "numero_acta", "fecha_creacion", "detalle_equipo",
        "firma_digital_hash", "certificado_serial",
        "firma_digital_timestamp", "firma_digital_valida",
    ]
