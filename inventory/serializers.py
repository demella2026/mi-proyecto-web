"""
Serializadores DRF para convertir modelos ↔ JSON.
Se usan serializadores anidados de solo lectura en Laptop y Celular
para que las respuestas GET muestren los datos completos de las FK (llaves foráneas),
mientras que la escritura (POST/PUT/PATCH) acepta solo los IDs.
"""

from rest_framework import serializers
from .models import (
    Marca, Modelo, Procesador, Ram, Almacenamiento,
    Area, Empleado, Laptop, Celular,
)

# ═══════════════════════════════════════════════
#  CATÁLOGOS
# ═══════════════════════════════════════════════

class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = "__all__"


class ModeloSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.CharField(source="marca.nombre", read_only=True)

    class Meta:
        model = Modelo
        fields = ["id", "marca", "marca_nombre", "nombre"]


class ProcesadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procesador
        fields = "__all__"


class RamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ram
        fields = "__all__"


class AlmacenamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Almacenamiento
        fields = "__all__"


# ═══════════════════════════════════════════════
#  ORGANIZACIÓN
# ═══════════════════════════════════════════════

class AreaSerializer(serializers.ModelSerializer):
    cantidad_empleados = serializers.IntegerField(source="empleados.count", read_only=True)

    class Meta:
        model = Area
        fields = ["id", "nombre", "descripcion", "cantidad_empleados"]


class EmpleadoSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source="area.nombre", read_only=True)

    class Meta:
        model = Empleado
        fields = ["id", "nombre", "email", "cargo", "area", "area_nombre", "activo"]


# ═══════════════════════════════════════════════
#  SERIALIZADORES ANIDADOS (Para lectura)
# ═══════════════════════════════════════════════

class MarcaNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ["id", "nombre"]


class ModeloNestedSerializer(serializers.ModelSerializer):
    marca = MarcaNestedSerializer(read_only=True)

    class Meta:
        model = Modelo
        fields = ["id", "marca", "nombre"]


class ProcesadorNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procesador
        fields = ["id", "nombre"]


class RamNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ram
        fields = ["id", "capacidad"]


class AlmacenamientoNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Almacenamiento
        fields = ["id", "capacidad"]


class EmpleadoNestedSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source="area.nombre", read_only=True)

    class Meta:
        model = Empleado
        fields = ["id", "nombre", "cargo", "area_nombre"]


# ═══════════════════════════════════════════════
#  LAPTOP
# ═══════════════════════════════════════════════

class LaptopReadSerializer(serializers.ModelSerializer):
    """Serializador de LECTURA: devuelve objetos anidados para mostrar la información completa."""
    marca = MarcaNestedSerializer(read_only=True)
    modelo = ModeloNestedSerializer(read_only=True)
    procesador = ProcesadorNestedSerializer(read_only=True)
    ram = RamNestedSerializer(read_only=True)
    almacenamiento = AlmacenamientoNestedSerializer(read_only=True)
    empleado_asignado = EmpleadoNestedSerializer(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Laptop
        fields = [
            "id", "numero_serie", "marca", "modelo", "procesador",
            "ram", "almacenamiento", "estado", "estado_display",
            "empleado_asignado", "fecha_ingreso", "notas",
        ]


class LaptopWriteSerializer(serializers.ModelSerializer):
    """Serializador de ESCRITURA: acepta solo los IDs de las relaciones."""
    class Meta:
        model = Laptop
        fields = [
            "id", "numero_serie", "marca", "modelo", "procesador",
            "ram", "almacenamiento", "estado", "empleado_asignado", "notas",
        ]


# ═══════════════════════════════════════════════
#  CELULAR
# ═══════════════════════════════════════════════

class CelularReadSerializer(serializers.ModelSerializer):
    """Serializador de LECTURA: devuelve objetos anidados para mostrar la información completa."""
    marca = MarcaNestedSerializer(read_only=True)
    modelo = ModeloNestedSerializer(read_only=True)
    ram = RamNestedSerializer(read_only=True)
    almacenamiento = AlmacenamientoNestedSerializer(read_only=True)
    empleado_asignado = EmpleadoNestedSerializer(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Celular
        fields = [
            "id", "imei", "numero_serie", "marca", "modelo",
            "ram", "almacenamiento", "estado", "estado_display",
            "empleado_asignado", "fecha_ingreso", "notas",
        ]


class CelularWriteSerializer(serializers.ModelSerializer):
    """Serializador de ESCRITURA: acepta solo los IDs de las relaciones."""
    class Meta:
        model = Celular
        fields = [
            "id", "imei", "numero_serie", "marca", "modelo",
            "ram", "almacenamiento", "estado", "empleado_asignado", "notas",
        ]