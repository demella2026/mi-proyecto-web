"""
Serializadores para las Actas de Entrega.
"""

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from .models import ActaEntrega


class ActaEntregaReadSerializer(serializers.ModelSerializer):
    """Serializador de lectura con datos expandidos."""
    tipo_acta_display = serializers.CharField(source="get_tipo_acta_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    empleado_nombre = serializers.CharField(source="empleado.get_full_name", read_only=True)
    empleado_cargo  = serializers.CharField(source="empleado.cargo", read_only=True)
    empleado_email  = serializers.EmailField(source="empleado.email", read_only=True, allow_null=True)
    empleado_area   = serializers.SerializerMethodField()
    responsable_nombre = serializers.SerializerMethodField()
    equipo_tipo = serializers.SerializerMethodField()
    equipo_str = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    tiene_firma_empleado = serializers.SerializerMethodField()
    tiene_firma_responsable = serializers.SerializerMethodField()
    tiene_firma_digital = serializers.SerializerMethodField()

    class Meta:
        model = ActaEntrega
        fields = [
            "id", "numero_acta", "content_type", "object_id",
            "equipo_tipo", "equipo_str",
            "tipo_acta", "tipo_acta_display", "estado", "estado_display",
            "empleado", "empleado_nombre", "empleado_cargo",
            "empleado_email", "empleado_area",
            "responsable_ti", "responsable_nombre",
            "detalle_equipo", "observaciones", "accesorios", "condiciones_uso",
            "tiene_firma_empleado", "tiene_firma_responsable",
            "tiene_firma_digital", "firma_digital_valida",
            "pdf_url",
            "fecha_creacion", "fecha_firma",
        ]

    def get_empleado_area(self, obj):
        if obj.empleado and obj.empleado.area:
            return obj.empleado.area.nombre
        return ""

    def get_responsable_nombre(self, obj):
        if obj.responsable_ti:
            return obj.responsable_ti.get_full_name() or obj.responsable_ti.username
        return ""

    def get_equipo_tipo(self, obj):
        return obj.content_type.model.capitalize()

    def get_equipo_str(self, obj):
        equipo = obj.equipo
        return str(equipo) if equipo else "Equipo eliminado"

    def get_pdf_url(self, obj):
        if obj.archivo_pdf:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.archivo_pdf.url)
            return obj.archivo_pdf.url
        return None

    def get_tiene_firma_empleado(self, obj):
        return bool(obj.firma_empleado_imagen)

    def get_tiene_firma_responsable(self, obj):
        return bool(obj.firma_responsable_imagen)

    def get_tiene_firma_digital(self, obj):
        return bool(obj.firma_digital_hash)


class ActaEntregaWriteSerializer(serializers.ModelSerializer):
    """Serializador de escritura."""
    equipo_tipo = serializers.ChoiceField(
        choices=["computador", "celular", "monitor", "chip"],
        write_only=True,
        required=False,
    )
    equipo_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ActaEntrega
        fields = [
            "id", "equipo_tipo", "equipo_id",
            "tipo_acta", "estado", "empleado", "responsable_ti",
            "observaciones", "accesorios", "condiciones_uso",
            "firma_empleado_imagen", "firma_responsable_imagen",
        ]

    def validate(self, data):
        equipo_tipo = data.pop("equipo_tipo", None)
        equipo_id = data.pop("equipo_id", None)

        if equipo_tipo and equipo_id:
            try:
                ct = ContentType.objects.get(app_label="inventory", model=equipo_tipo)
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
        if "numero_acta" not in validated_data or not validated_data.get("numero_acta"):
            validated_data["numero_acta"] = ActaEntrega.generar_numero_acta()

        instance = super().create(validated_data)
        instance.capturar_detalle_equipo()
        instance.save()
        return instance


class FirmaActaSerializer(serializers.Serializer):
    """Serializador para firmar un acta (firma simple con imagen)."""
    firma_empleado_imagen = serializers.CharField(required=False, allow_blank=True)
    firma_responsable_imagen = serializers.CharField(required=False, allow_blank=True)


class FirmaDigitalSerializer(serializers.Serializer):
    """Serializador para aplicar una firma digital certificada."""
    firma_digital_hash = serializers.CharField(max_length=512)
    certificado_serial = serializers.CharField(max_length=255)
    firma_digital_timestamp = serializers.DateTimeField()
