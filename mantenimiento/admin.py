from django.contrib import admin
from .models import Mantenimiento, ArchivoMantenimiento


class ArchivoInline(admin.TabularInline):
    model = ArchivoMantenimiento
    extra = 0
    fields = ["archivo", "tipo", "descripcion", "fecha_subida"]
    readonly_fields = ["fecha_subida"]


@admin.register(Mantenimiento)
class MantenimientoAdmin(admin.ModelAdmin):
    list_display = [
        "id", "content_type", "object_id", "tipo", "estado",
        "tecnico_responsable", "costo_total", "fecha_creacion",
    ]
    list_filter = ["tipo", "estado", "content_type", "fecha_creacion"]
    search_fields = ["descripcion", "diagnostico", "componentes_cambiados"]
    date_hierarchy = "fecha_creacion"
    inlines = [ArchivoInline]
    readonly_fields = ["fecha_creacion"]


@admin.register(ArchivoMantenimiento)
class ArchivoMantenimientoAdmin(admin.ModelAdmin):
    list_display = ["id", "mantenimiento", "tipo", "descripcion", "fecha_subida"]
    list_filter = ["tipo"]
    readonly_fields = ["fecha_subida"]
