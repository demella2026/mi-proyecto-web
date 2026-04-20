"""
Serializadores para la Bitacora Tecnica de Mantenimiento.
"""

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from .models import Mantenimiento, ArchivoMantenimiento


class ArchivoMantenimientoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = ArchivoMantenimiento
        fields = [
            "id", "mantenimiento", "archivo", "tipo", "tipo_display",
            "descripcion", "fecha_subida",
        ]
        read_only_fields = ["fecha_subida"]


class MantenimientoReadSerializer(serializers.ModelSerializer):
    """Serializador de lectura con datos expandidos."""
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    costo_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    archivos = ArchivoMantenimientoSerializer(many=True, read_only=True)

    # Info del equipo
    equipo_tipo = serializers.SerializerMethodField()
    equipo_str = serializers.SerializerMethodField()
    equipo_numero_serie = serializers.SerializerMethodField()

    # Info del tecnico
    tecnico_nombre = serializers.SerializerMethodField()

    # Info de specs nuevas
    nueva_ram_nombre = serializers.SerializerMethodField()
    nuevo_almacenamiento_nombre = serializers.SerializerMethodField()
    nuevo_procesador_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Mantenimiento
        fields = [
            "id", "content_type", "object_id",
            "equipo_tipo", "equipo_str", "equipo_numero_serie",
            "tipo", "tipo_display", "estado", "estado_display",
            "descripcion", "diagnostico",
            "componentes_cambiados", "actualizar_specs",
            "nueva_ram", "nueva_ram_nombre",
            "nuevo_almacenamiento", "nuevo_almacenamiento_nombre",
            "nuevo_procesador", "nuevo_procesador_nombre",
            "costo_repuestos", "costo_mano_obra", "costo_total",
            "tecnico_responsable", "tecnico_nombre", "proveedor_externo",
            "fecha_creacion", "fecha_inicio", "fecha_fin",
            "notas", "archivos",
        ]

    def get_equipo_tipo(self, obj):
        return obj.content_type.model.capitalize()

    def get_equipo_str(self, obj):
        equipo = obj.equipo
        return str(equipo) if equipo else "Equipo eliminado"

    def get_equipo_numero_serie(self, obj):
        equipo = obj.equipo
        if equipo and hasattr(equipo, "numero_serie"):
            return equipo.numero_serie
        return ""

    def get_tecnico_nombre(self, obj):
        if obj.tecnico_responsable:
            u = obj.tecnico_responsable
            return u.get_full_name() or u.username
        return ""

    def get_nueva_ram_nombre(self, obj):
        return str(obj.nueva_ram) if obj.nueva_ram else ""

    def get_nuevo_almacenamiento_nombre(self, obj):
        return str(obj.nuevo_almacenamiento) if obj.nuevo_almacenamiento else ""

    def get_nuevo_procesador_nombre(self, obj):
        return str(obj.nuevo_procesador) if obj.nuevo_procesador else ""


class MantenimientoWriteSerializer(serializers.ModelSerializer):
    """Serializador de escritura: acepta IDs."""
    equipo_tipo = serializers.ChoiceField(
        choices=["computador", "celular", "monitor"],
        write_only=True,
        help_text="Tipo de equipo: 'computador', 'celular' o 'monitor'",
    )
    equipo_id = serializers.IntegerField(
        write_only=True,
        help_text="ID del equipo",
    )

    class Meta:
        model = Mantenimiento
        fields = [
            "id", "equipo_tipo", "equipo_id",
            "tipo", "estado", "descripcion", "diagnostico",
            "componentes_cambiados", "actualizar_specs",
            "nueva_ram", "nuevo_almacenamiento", "nuevo_procesador",
            "costo_repuestos", "costo_mano_obra",
            "tecnico_responsable", "proveedor_externo",
            "fecha_inicio", "fecha_fin", "notas",
        ]

    def validate(self, data):
        equipo_tipo = data.pop("equipo_tipo", None)
        equipo_id = data.pop("equipo_id", None)

        if equipo_tipo and equipo_id:
            try:
                ct = ContentType.objects.get(app_label="inventory", model=equipo_tipo)
                # Verificar que el equipo existe
                model_class = ct.model_class()
                if not model_class.objects.filter(pk=equipo_id).exists():
                    raise serializers.ValidationError(
                        {"equipo_id": f"No existe un {equipo_tipo} con ID {equipo_id}."}
                    )
                data["content_type"] = ct
                data["object_id"] = equipo_id
            except ContentType.DoesNotExist:
                raise serializers.ValidationError(
                    {"equipo_tipo": "Tipo de equipo invalido."}
                )

        return data

    def create(self, validated_data):
        instance = super().create(validated_data)
        # Si se crea ya completado con actualizar_specs, aplicar cambios
        instance.aplicar_cambios_specs()
        return instance

    def update(self, instance, validated_data):
        old_estado = instance.estado
        instance = super().update(instance, validated_data)
        # Si el estado cambio a completado, aplicar cambios de specs
        if old_estado != "completado" and instance.estado == "completado":
            instance.aplicar_cambios_specs()
        return instance
