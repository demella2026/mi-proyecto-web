from rest_framework import serializers
from .models import RegistroCambio


class RegistroCambioSerializer(serializers.ModelSerializer):
    tipo_equipo = serializers.SerializerMethodField()
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model = RegistroCambio
        fields = [
            'id',
            'tipo_equipo',
            'object_id',
            'accion',
            'accion_display',
            'campo',
            'valor_anterior',
            'valor_nuevo',
            'descripcion',
            'usuario',
            'direccion_ip',
            'fecha',
        ]
        read_only_fields = fields

    def get_tipo_equipo(self, obj):
        if obj.content_type:
            return obj.content_type.model.capitalize()
        return None