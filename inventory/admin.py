"""
Registro de modelos en el admin de Django.
Util para carga inicial de datos de catalogos y gestion del inventario.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from .models import (
    Marca, Modelo, Procesador, Ram, Almacenamiento,
    SistemaOperativo, Software,
    Area, CentroCosto, Empleado,
    Computador, Celular, Chip, Monitor, ComputadorSoftware,
    PerfilUsuario,
)

User = get_user_model()


class PerfilUsuarioInline(admin.StackedInline):
    model = PerfilUsuario
    can_delete = False
    verbose_name = "Perfil (Rol + Centro de Costo)"
    fk_name = "user"


class UsuarioAdmin(BaseUserAdmin):
    inlines = [PerfilUsuarioInline]
    list_display = ["username", "first_name", "last_name", "email", "is_staff", "get_rol"]

    def get_rol(self, obj):
        try:
            return obj.perfil.get_rol_display()
        except Exception:
            return "—"
    get_rol.short_description = "Rol"


admin.site.unregister(User)
admin.site.register(User, UsuarioAdmin)


@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ["id", "nombre"]
    search_fields = ["nombre"]


@admin.register(Modelo)
class ModeloAdmin(admin.ModelAdmin):
    list_display = ["id", "marca", "nombre"]
    list_filter = ["marca"]
    search_fields = ["nombre", "marca__nombre"]


@admin.register(Procesador)
class ProcesadorAdmin(admin.ModelAdmin):
    list_display = ["id", "nombre"]
    search_fields = ["nombre"]


@admin.register(Ram)
class RamAdmin(admin.ModelAdmin):
    list_display = ["id", "capacidad", "part_number"]
    search_fields = ["capacidad", "part_number"]


@admin.register(Almacenamiento)
class AlmacenamientoAdmin(admin.ModelAdmin):
    list_display = ["id", "tipo", "capacidad", "nombre_modelo"]
    list_filter = ["tipo"]
    search_fields = ["capacidad", "nombre_modelo"]


@admin.register(SistemaOperativo)
class SistemaOperativoAdmin(admin.ModelAdmin):
    list_display = ["id", "nombre"]
    search_fields = ["nombre"]


@admin.register(Software)
class SoftwareAdmin(admin.ModelAdmin):
    list_display = ["id", "nombre", "fabricante"]
    search_fields = ["nombre", "fabricante"]


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ["id", "nombre", "ldap_ou_dn"]
    search_fields = ["nombre", "ldap_ou_dn"]


@admin.register(CentroCosto)
class CentroCostoAdmin(admin.ModelAdmin):
    list_display = ["id", "codigo", "nombre", "tipo", "area", "activo"]
    list_filter = ["tipo", "activo", "area"]
    search_fields = ["codigo", "nombre"]


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = [
        "id", "numero_documento", "username", "first_name", "last_name",
        "cargo", "area", "centro_costo", "activo",
    ]
    list_filter = ["activo", "area", "centro_costo"]
    search_fields = ["first_name", "last_name", "username", "numero_documento", "cargo"]
    readonly_fields = ["ldap_object_guid", "ldap_dn", "fecha_desactivacion"]


@admin.register(Computador)
class ComputadorAdmin(admin.ModelAdmin):
    list_display = [
        "numero_inventario", "numero_serie", "tipo_equipo",
        "marca", "modelo", "procesador", "ram", "almacenamiento",
        "sistema_operativo", "estado", "en_inventario",
        "empleado_asignado", "fecha_ingreso",
    ]
    list_filter = ["estado", "tipo_equipo", "marca", "procesador", "en_inventario"]
    search_fields = [
        "numero_inventario", "numero_serie",
        "marca__nombre", "modelo__nombre",
    ]


@admin.register(Celular)
class CelularAdmin(admin.ModelAdmin):
    list_display = [
        "numero_linea", "imei", "numero_serie", "tipo_equipo",
        "marca", "modelo", "ram", "almacenamiento",
        "estado", "empleado_asignado", "fecha_ingreso",
    ]
    list_filter = ["estado", "tipo_equipo", "marca"]
    search_fields = ["numero_linea", "imei", "numero_serie", "marca__nombre"]


@admin.register(Monitor)
class MonitorAdmin(admin.ModelAdmin):
    list_display = [
        "numero_inventario", "marca", "modelo", "numero_serie",
        "estado", "computador", "centro_costo", "fecha_ingreso",
    ]
    list_filter = ["estado", "marca"]
    search_fields = ["numero_inventario", "numero_serie", "marca__nombre"]


@admin.register(Chip)
class ChipAdmin(admin.ModelAdmin):
    list_display = [
        "id", "numero_linea", "operador", "iccid", "plan",
        "celular", "empleado_asignado", "estado", "fecha_ingreso",
    ]
    list_filter = ["estado", "operador"]
    search_fields = ["numero_linea", "iccid", "plan"]


@admin.register(ComputadorSoftware)
class ComputadorSoftwareAdmin(admin.ModelAdmin):
    list_display = ["id", "computador", "software", "version", "fecha_instalacion"]
    list_filter = ["software"]
    search_fields = ["computador__numero_inventario", "software__nombre"]
