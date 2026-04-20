from django.contrib import admin
from .models import SyncLog, LDAPMapping


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = [
        "id", "fecha", "estado", "empleados_creados",
        "empleados_actualizados", "empleados_desactivados",
        "duracion_segundos", "ejecutado_por",
    ]
    list_filter = ["estado", "fecha"]
    date_hierarchy = "fecha"
    readonly_fields = [
        "fecha", "estado", "empleados_creados", "empleados_actualizados",
        "empleados_desactivados", "errores", "duracion_segundos", "ejecutado_por",
    ]


@admin.register(LDAPMapping)
class LDAPMappingAdmin(admin.ModelAdmin):
    list_display = ["atributo_ldap", "campo_empleado", "activo"]
    list_filter = ["activo"]
