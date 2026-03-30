from django.contrib import admin
from .models import RegistroCambio


@admin.register(RegistroCambio)
class RegistroCambioAdmin(admin.ModelAdmin):
    list_display = [
        'fecha',
        'accion',
        'content_type',
        'object_id',
        'campo',
        'valor_anterior',
        'valor_nuevo',
        'usuario',
        'direccion_ip',
    ]
    list_filter = ['accion', 'content_type', 'fecha', 'usuario']
    search_fields = ['descripcion', 'campo', 'usuario']
    readonly_fields = [
        'content_type',
        'object_id',
        'accion',
        'campo',
        'valor_anterior',
        'valor_nuevo',
        'descripcion',
        'usuario',
        'direccion_ip',
        'fecha',
    ]
    date_hierarchy = 'fecha'
    ordering = ['-fecha']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False