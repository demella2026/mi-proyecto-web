"""
Serializadores DRF para convertir modelos <-> JSON.
Se usan serializadores anidados de solo lectura en Computador, Celular y Monitor
para que las respuestas GET muestren los datos completos de las FK,
mientras que la escritura (POST/PUT/PATCH) acepta solo los IDs.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    Marca, Modelo, Procesador, Ram, Almacenamiento,
    SistemaOperativo, Software,
    Area, CentroCosto, Empleado,
    Computador, Celular, Chip, Monitor, ComputadorSoftware,
    PerfilUsuario, RolUsuario,
    SolicitudCorreo, TipoSolicitudCorreo, EstadoSolicitudCorreo,
)

User = get_user_model()

# ═══════════════════════════════════════════════
#  CATALOGOS
# ═══════════════════════════════════════════════

class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = "__all__"


class ModeloSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.CharField(source="marca.nombre", read_only=True)

    class Meta:
        model = Modelo
        fields = ["id", "marca", "marca_nombre", "nombre", "tipo_equipo"]


class ProcesadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procesador
        fields = "__all__"


class RamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ram
        fields = "__all__"


class AlmacenamientoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Almacenamiento
        fields = ["id", "tipo", "tipo_display", "capacidad", "nombre_modelo"]


class SistemaOperativoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SistemaOperativo
        fields = "__all__"


class SoftwareSerializer(serializers.ModelSerializer):
    class Meta:
        model = Software
        fields = "__all__"


# ═══════════════════════════════════════════════
#  ORGANIZACION
# ═══════════════════════════════════════════════

class AreaSerializer(serializers.ModelSerializer):
    cantidad_empleados = serializers.SerializerMethodField()

    class Meta:
        model = Area
        fields = ["id", "nombre", "descripcion", "cantidad_empleados", "ldap_ou_dn"]

    def get_cantidad_empleados(self, obj):
        """Cuenta los empleados activos del área (excluye los desactivados)."""
        return obj.empleados.filter(activo=True).count()


class CentroCostoSerializer(serializers.ModelSerializer):
    area_nombre        = serializers.CharField(source="area.nombre", read_only=True)
    tipo_display       = serializers.CharField(source="get_tipo_display", read_only=True)
    cantidad_empleados = serializers.IntegerField(source="empleados.count", read_only=True)
    total_computadores = serializers.SerializerMethodField()
    total_celulares    = serializers.SerializerMethodField()
    total_monitores    = serializers.SerializerMethodField()
    total_chips        = serializers.SerializerMethodField()
    pendientes_devolucion = serializers.SerializerMethodField()
    responsable_nombre = serializers.SerializerMethodField()

    class Meta:
        model = CentroCosto
        fields = [
            "id", "codigo", "nombre", "tipo", "tipo_display",
            "area", "area_nombre", "activo", "descripcion",
            "cantidad_empleados",
            "total_computadores", "total_celulares",
            "total_monitores", "total_chips",
            "pendientes_devolucion", "responsable_nombre",
        ]

    def _emp_ids(self, obj):
        """Retorna lista de IDs de todos los empleados del CC (activos e inactivos) para filtros batch."""
        return list(obj.empleados.values_list("id", flat=True))

    def get_total_computadores(self, obj):
        """Cuenta computadores asignados a empleados de este CC."""
        from .models import Computador
        return Computador.objects.filter(empleado_asignado__in=self._emp_ids(obj)).count()

    def get_total_celulares(self, obj):
        """Cuenta celulares asignados a empleados de este CC."""
        from .models import Celular
        return Celular.objects.filter(empleado_asignado__in=self._emp_ids(obj)).count()

    def get_total_monitores(self, obj):
        """Cuenta monitores cuyo centro_costo FK apunta directamente a este CC."""
        from .models import Monitor
        return Monitor.objects.filter(centro_costo=obj).count()

    def get_total_chips(self, obj):
        """Cuenta chips/SIMs asignados a empleados de este CC."""
        from .models import Chip
        return Chip.objects.filter(empleado_asignado__in=self._emp_ids(obj)).count()

    def get_pendientes_devolucion(self, obj):
        """Suma computadores + celulares en estado PENDIENTE_DEVOLUCION del CC. Alerta de equipos no retornados."""
        from .models import Computador, Celular
        ids = self._emp_ids(obj)
        return (
            Computador.objects.filter(empleado_asignado__in=ids, estado="PENDIENTE_DEVOLUCION").count()
            + Celular.objects.filter(empleado_asignado__in=ids, estado="PENDIENTE_DEVOLUCION").count()
        )

    def get_responsable_nombre(self, obj):
        """Retorna el nombre del primer usuario con rol ENCARGADO_OBRA asignado al CC, o None si no existe."""
        enc = obj.usuarios_encargados.select_related("user").first()
        if enc:
            return enc.user.get_full_name() or enc.user.username
        return None


class EmpleadoSerializer(serializers.ModelSerializer):
    area_nombre         = serializers.CharField(source="area.nombre", read_only=True)
    centro_costo_str    = serializers.CharField(source="centro_costo.__str__", read_only=True)
    nombre_completo     = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = Empleado
        fields = [
            "id", "numero_documento", "username", "first_name", "last_name",
            "nombre_completo", "cargo", "email",
            "area", "area_nombre",
            "centro_costo", "centro_costo_str",
            "activo", "fecha_desactivacion", "ldap_object_guid",
        ]


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
        fields = ["id", "capacidad", "part_number"]


class AlmacenamientoNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Almacenamiento
        fields = ["id", "tipo", "capacidad", "nombre_modelo"]


class SistemaOperativoNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = SistemaOperativo
        fields = ["id", "nombre"]


class EmpleadoNestedSerializer(serializers.ModelSerializer):
    area_nombre      = serializers.CharField(source="area.nombre", read_only=True)
    nombre_completo  = serializers.CharField(source="get_full_name", read_only=True)
    centro_costo_str = serializers.CharField(source="centro_costo.__str__", read_only=True)

    class Meta:
        model = Empleado
        fields = ["id", "nombre_completo", "cargo", "area_nombre", "centro_costo_str"]


# ═══════════════════════════════════════════════
#  CHIP / SIM
# ═══════════════════════════════════════════════

class ChipReadSerializer(serializers.ModelSerializer):
    empleado_asignado = EmpleadoNestedSerializer(read_only=True)
    estado_display    = serializers.CharField(source="get_estado_display", read_only=True)
    operador_display  = serializers.CharField(source="get_operador_display", read_only=True)
    celular_str       = serializers.CharField(source="celular.__str__", read_only=True)

    class Meta:
        model = Chip
        fields = [
            "id", "numero_linea", "operador", "operador_display",
            "iccid", "plan",
            "celular", "celular_str",
            "empleado_asignado", "estado", "estado_display",
            "fecha_ingreso", "notas",
        ]


class ChipWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chip
        fields = [
            "id", "numero_linea", "operador", "iccid", "plan",
            "celular", "empleado_asignado", "estado", "notas",
        ]


# ═══════════════════════════════════════════════
#  COMPUTADOR
# ═══════════════════════════════════════════════

class ComputadorReadSerializer(serializers.ModelSerializer):
    """Serializador de LECTURA: devuelve objetos anidados para mostrar la informacion completa."""
    marca = MarcaNestedSerializer(read_only=True)
    modelo = ModeloNestedSerializer(read_only=True)
    procesador = ProcesadorNestedSerializer(read_only=True)
    ram = RamNestedSerializer(read_only=True)
    almacenamiento = AlmacenamientoNestedSerializer(read_only=True)
    sistema_operativo = SistemaOperativoNestedSerializer(read_only=True)
    empleado_asignado = EmpleadoNestedSerializer(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_equipo_display = serializers.CharField(source="get_tipo_equipo_display", read_only=True)

    class Meta:
        model = Computador
        fields = [
            "id", "numero_inventario", "numero_serie",
            "tipo_equipo", "tipo_equipo_display",
            "marca", "modelo", "procesador",
            "ram", "numero_sticks_ram", "almacenamiento",
            "sistema_operativo",
            "estado", "estado_display", "en_inventario",
            "empleado_asignado", "fecha_ingreso",
            "accesorios", "comentario", "notas",
        ]


class ComputadorWriteSerializer(serializers.ModelSerializer):
    """Serializador de ESCRITURA: acepta solo los IDs de las relaciones."""
    class Meta:
        model = Computador
        fields = [
            "id", "numero_inventario", "numero_serie",
            "tipo_equipo", "marca", "modelo", "procesador",
            "ram", "numero_sticks_ram", "almacenamiento",
            "sistema_operativo",
            "estado", "en_inventario", "empleado_asignado",
            "accesorios", "comentario", "notas",
        ]

    def validate_numero_serie(self, value):
        """Rechaza números de serie con espacios — el S/N debe ser una cadena sin blancos."""
        if value and " " in value:
            raise serializers.ValidationError("El numero de serie no puede contener espacios.")
        return value

    def validate_numero_inventario(self, value):
        """
        Valida que el número de inventario siga el formato 'ELEQ-NNNN'.
        - Debe comenzar con 'ELEQ-'
        - Los caracteres posteriores deben ser dígitos numéricos
        - Normaliza a mayúsculas antes de guardar
        """
        if value and not value.upper().startswith("ELEQ-"):
            raise serializers.ValidationError("El numero de inventario debe comenzar con 'ELEQ-'.")
        if value:
            suffix = value[5:]  # parte despues de "ELEQ-"
            if suffix and not suffix.isdigit():
                raise serializers.ValidationError("El numero de inventario solo puede contener digitos despues de 'ELEQ-'.")
        return value.upper() if value else value


# ═══════════════════════════════════════════════
#  CELULAR
# ═══════════════════════════════════════════════

class CelularReadSerializer(serializers.ModelSerializer):
    """Serializador de LECTURA: devuelve objetos anidados para mostrar la informacion completa."""
    marca = MarcaNestedSerializer(read_only=True)
    modelo = ModeloNestedSerializer(read_only=True)
    ram = RamNestedSerializer(read_only=True)
    almacenamiento = AlmacenamientoNestedSerializer(read_only=True)
    empleado_asignado = EmpleadoNestedSerializer(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_equipo_display = serializers.CharField(source="get_tipo_equipo_display", read_only=True)

    class Meta:
        model = Celular
        fields = [
            "id", "numero_linea", "imei", "numero_serie",
            "tipo_equipo", "tipo_equipo_display",
            "marca", "modelo",
            "ram", "almacenamiento",
            "estado", "estado_display",
            "empleado_asignado", "fecha_ingreso", "notas",
        ]


class CelularWriteSerializer(serializers.ModelSerializer):
    """Serializador de ESCRITURA: acepta solo los IDs de las relaciones."""
    class Meta:
        model = Celular
        fields = [
            "id", "numero_linea", "imei", "numero_serie",
            "tipo_equipo", "marca", "modelo",
            "ram", "almacenamiento",
            "estado", "empleado_asignado", "notas",
        ]


# ═══════════════════════════════════════════════
#  MONITOR
# ═══════════════════════════════════════════════

class CentroCostoNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroCosto
        fields = ["id", "codigo", "nombre", "tipo"]


class MonitorReadSerializer(serializers.ModelSerializer):
    """Serializador de LECTURA para monitores."""
    marca = MarcaNestedSerializer(read_only=True)
    modelo = ModeloNestedSerializer(read_only=True)
    centro_costo = CentroCostoNestedSerializer(read_only=True)
    computador_str = serializers.StringRelatedField(source="computador", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Monitor
        fields = [
            "id", "numero_inventario", "marca", "modelo",
            "numero_serie", "estado", "estado_display",
            "computador", "computador_str",
            "centro_costo", "fecha_ingreso", "notas",
        ]


class MonitorWriteSerializer(serializers.ModelSerializer):
    """Serializador de ESCRITURA para monitores."""
    class Meta:
        model = Monitor
        fields = [
            "id", "numero_inventario", "marca", "modelo",
            "numero_serie", "estado",
            "computador", "centro_costo",
            "fecha_ingreso", "notas",
        ]


# ═══════════════════════════════════════════════
#  COMPUTADOR SOFTWARE
# ═══════════════════════════════════════════════

class ComputadorSoftwareReadSerializer(serializers.ModelSerializer):
    software_nombre = serializers.CharField(source="software.nombre", read_only=True)
    software_fabricante = serializers.CharField(source="software.fabricante", read_only=True)
    computador_str = serializers.StringRelatedField(source="computador", read_only=True)

    class Meta:
        model = ComputadorSoftware
        fields = [
            "id", "computador", "computador_str",
            "software", "software_nombre", "software_fabricante",
            "version", "fecha_instalacion",
        ]


class ComputadorSoftwareWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComputadorSoftware
        fields = ["id", "computador", "software", "version", "fecha_instalacion"]


# ═══════════════════════════════════════════════
#  USUARIOS + PERFILES
# ═══════════════════════════════════════════════

class PerfilSerializer(serializers.ModelSerializer):
    centro_costo_str = serializers.CharField(
        source="centro_costo.__str__", read_only=True, default=None
    )

    class Meta:
        model = PerfilUsuario
        fields = ["rol", "centro_costo", "centro_costo_str"]


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer para gestión de usuarios + rol + CC desde el frontend."""
    perfil = PerfilSerializer(required=False)
    nombre_completo = serializers.SerializerMethodField()
    # Campos de escritura plana (más cómodo para el form)
    rol          = serializers.ChoiceField(choices=RolUsuario.choices, write_only=True, required=False)
    centro_costo = serializers.PrimaryKeyRelatedField(
        queryset=CentroCosto.objects.all(), write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "is_active", "is_staff",
            "nombre_completo", "perfil",
            # write-only helpers
            "password", "rol", "centro_costo",
        ]
        extra_kwargs = {
            "password": {"write_only": True, "required": False},
        }

    def get_nombre_completo(self, obj):
        """Retorna 'Nombre Apellido' del usuario, o el username si no tiene nombre registrado."""
        return obj.get_full_name() or obj.username

    def _upsert_perfil(self, user, rol, cc):
        """
        Crea o actualiza el PerfilUsuario asociado al user.
        - Si rol es ADMIN, sincroniza is_staff=True en el objeto User.
        - El centro_costo se limpia explícitamente si el formulario lo envió vacío.
        """
        perfil, _ = PerfilUsuario.objects.get_or_create(user=user)
        if rol is not None:
            perfil.rol = rol
        if cc is not None or self.context["request"].data.get("centro_costo") == "":
            perfil.centro_costo = cc
        # Auto-sync is_staff with ADMIN role
        if rol == RolUsuario.ADMIN:
            user.is_staff = True
            user.save(update_fields=["is_staff"])
        perfil.save()

    def create(self, validated_data):
        """
        Crea un nuevo User extrayendo primero los campos auxiliares (rol, cc, password)
        que no pertenecen al modelo User directamente.
        Si no se proporciona contraseña, el usuario queda sin acceso por contraseña (set_unusable_password).
        """
        rol = validated_data.pop("rol", RolUsuario.VIEWER)
        cc  = validated_data.pop("centro_costo", None)
        password = validated_data.pop("password", None)
        validated_data.pop("perfil", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        self._upsert_perfil(user, rol, cc)
        return user

    def update(self, instance, validated_data):
        """
        Actualiza los campos del User y su perfil.
        La contraseña se rehashea solo si se proporciona un valor nuevo.
        Si rol o cc son None (no vienen en el PATCH), no se modifican.
        """
        rol = validated_data.pop("rol", None)
        cc  = validated_data.pop("centro_costo", None)
        password = validated_data.pop("password", None)
        validated_data.pop("perfil", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        self._upsert_perfil(instance, rol, cc)
        return instance


# ═══════════════════════════════════════════════
#  SOLICITUDES DE CORREO ELECTRÓNICO
# ═══════════════════════════════════════════════

class SolicitudCorreoReadSerializer(serializers.ModelSerializer):
    """
    Serializer de lectura para SolicitudCorreo.
    Expande FK (centro_costo, solicitante) con datos legibles para el frontend.
    """
    centro_costo_nombre = serializers.CharField(
        source="centro_costo.__str__", read_only=True
    )
    solicitante_nombre = serializers.SerializerMethodField()
    tipo_label         = serializers.CharField(source="get_tipo_display",   read_only=True)
    estado_label       = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model  = SolicitudCorreo
        fields = [
            "id", "tipo", "tipo_label", "estado", "estado_label",
            "empleado_nombre", "empleado_rut", "empleado_cargo",
            "centro_costo", "centro_costo_nombre",
            "fecha_requerida", "numero_ticket_cau", "link_solicitud_cau",
            "observaciones", "solicitante", "solicitante_nombre",
            "created_at", "updated_at",
        ]

    def get_solicitante_nombre(self, obj):
        """Retorna el nombre completo del usuario que registró la solicitud, o su username."""
        return obj.solicitante.get_full_name() or obj.solicitante.username


class SolicitudCorreoWriteSerializer(serializers.ModelSerializer):
    """
    Serializer de escritura para SolicitudCorreo.
    Acepta IDs para FK y asigna el solicitante automáticamente desde el request.
    """
    class Meta:
        model  = SolicitudCorreo
        fields = [
            "tipo", "estado",
            "empleado_nombre", "empleado_rut", "empleado_cargo",
            "centro_costo",
            "fecha_requerida", "numero_ticket_cau", "link_solicitud_cau",
            "observaciones",
        ]

    def create(self, validated_data):
        """Crea la solicitud asignando el solicitante desde el usuario autenticado del request."""
        validated_data["solicitante"] = self.context["request"].user
        return super().create(validated_data)

