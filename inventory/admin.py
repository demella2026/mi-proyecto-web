"""
Registro de modelos en el admin de Django.
Útil para carga inicial de datos de catálogos.
"""

from django.contrib import admin
from .models import (
    Marca,
    Modelo,
    Procesador,
    Ram,
    Almacenamiento,
    Laptop,
    Celular,
)


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
    list_display = ["id", "capacidad"]


@admin.register(Almacenamiento)
class AlmacenamientoAdmin(admin.ModelAdmin):
    list_display = ["id", "capacidad"]


@admin.register(Laptop)
class LaptopAdmin(admin.ModelAdmin):
    list_display = [
        "numero_serie", "marca", "modelo",
        "procesador", "ram", "almacenamiento",
        "estado", "fecha_ingreso",
    ]
    list_filter = ["estado", "marca", "procesador"]
    search_fields = ["numero_serie", "marca__nombre", "modelo__nombre"]


@admin.register(Celular)
class CelularAdmin(admin.ModelAdmin):
    list_display = [
        "imei", "numero_serie", "marca", "modelo",
        "ram", "almacenamiento", "estado", "fecha_ingreso",
    ]
    list_filter = ["estado", "marca"]
    search_fields = ["imei", "numero_serie", "marca__nombre"]