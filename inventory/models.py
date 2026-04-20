"""
Modelos normalizados para el inventario de equipos TI.
Incluye catalogos base, organizacion de la empresa y registro de equipos
(Computador, Celular, Monitor) con asignacion a empleados e historial.
"""

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from simple_history.models import HistoricalRecords


# ═══════════════════════════════════════════════
#  CATALOGOS BASE
# ═══════════════════════════════════════════════

class Marca(models.Model):
    """Catalogo de marcas (HP, Dell, Apple, Samsung, etc.)."""
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre de la marca",
    )

    class Meta:
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"
        ordering = ["nombre"]

    def __str__(self):
        """Devuelve el nombre de la marca como representación legible del objeto."""
        return self.nombre


class TipoEquipoModelo(models.TextChoices):
    COMPUTADOR = "COMPUTADOR", "Computador / Laptop / Desktop"
    CELULAR    = "CELULAR",    "Celular / Tablet"
    MONITOR    = "MONITOR",    "Monitor / Pantalla"
    OTRO       = "OTRO",       "Otro"


class Modelo(models.Model):
    """
    Catalogo de modelos de equipos.
    Cada modelo pertenece a una sola marca y a un tipo de equipo.
    """
    marca = models.ForeignKey(
        Marca,
        on_delete=models.CASCADE,
        related_name="modelos",
        verbose_name="Marca",
    )
    nombre = models.CharField(
        max_length=150,
        verbose_name="Nombre del modelo",
    )
    tipo_equipo = models.CharField(
        max_length=15,
        choices=TipoEquipoModelo.choices,
        default=TipoEquipoModelo.COMPUTADOR,
        verbose_name="Tipo de equipo",
        help_text="Categoría del equipo al que corresponde este modelo.",
    )

    class Meta:
        verbose_name = "Modelo"
        verbose_name_plural = "Modelos"
        ordering = ["marca__nombre", "nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["marca", "nombre"],
                name="unique_marca_modelo",
            )
        ]

    def __str__(self):
        """Devuelve 'Marca Modelo', ej: 'HP EliteBook 840 G9'."""
        return f"{self.marca.nombre} {self.nombre}"


class Procesador(models.Model):
    """Catalogo de procesadores (Intel Core i5, Apple M1, etc.)."""
    nombre = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="Procesador",
    )

    class Meta:
        verbose_name = "Procesador"
        verbose_name_plural = "Procesadores"
        ordering = ["nombre"]

    def __str__(self):
        """Devuelve el nombre del procesador, ej: 'Intel Core i7-1165G7'."""
        return self.nombre


class Ram(models.Model):
    """Catalogo de configuraciones de memoria RAM."""
    capacidad = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Capacidad de RAM",
        help_text="Ejemplo: 8GB, 16GB, 32GB",
    )
    part_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Part Number",
        help_text="P/N del fabricante del modulo de RAM.",
    )

    class Meta:
        verbose_name = "RAM"
        verbose_name_plural = "Memorias RAM"
        ordering = ["capacidad"]

    def __str__(self):
        """Devuelve capacidad y part number si está disponible, ej: '16GB (KVR32N22D8/16)'."""
        if self.part_number:
            return f"{self.capacidad} ({self.part_number})"
        return self.capacidad


class TipoAlmacenamiento(models.TextChoices):
    SSD = "SSD", "SSD"
    HDD = "HDD", "HDD"
    NVME = "NVME", "NVMe"
    EMMC = "EMMC", "eMMC"


class Almacenamiento(models.Model):
    """Catalogo de configuraciones de almacenamiento."""
    tipo = models.CharField(
        max_length=10,
        choices=TipoAlmacenamiento.choices,
        default=TipoAlmacenamiento.SSD,
        verbose_name="Tipo de almacenamiento",
    )
    capacidad = models.CharField(
        max_length=100,
        verbose_name="Capacidad",
        help_text="Ejemplo: 256GB, 1TB, 512GB",
    )
    nombre_modelo = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name="Modelo del disco",
        help_text="Modelo exacto del disco (ej: Samsung 970 EVO Plus).",
    )

    class Meta:
        verbose_name = "Almacenamiento"
        verbose_name_plural = "Almacenamientos"
        ordering = ["tipo", "capacidad"]
        unique_together = [("tipo", "capacidad")]

    def __str__(self):
        """Devuelve capacidad, tipo y modelo del disco, ej: '512GB SSD (Samsung 970 EVO)'."""
        base = f"{self.capacidad} {self.get_tipo_display()}"
        if self.nombre_modelo:
            return f"{base} ({self.nombre_modelo})"
        return base


class SistemaOperativo(models.Model):
    """Catalogo de sistemas operativos (WIN 11 PRO, macOS Ventura, etc.)."""
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Sistema operativo",
    )

    class Meta:
        verbose_name = "Sistema operativo"
        verbose_name_plural = "Sistemas operativos"
        ordering = ["nombre"]

    def __str__(self):
        """Devuelve el nombre del sistema operativo, ej: 'Windows 11 Pro'."""
        return self.nombre


class Software(models.Model):
    """Catalogo de software instalable en computadores."""
    nombre = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="Nombre del software",
    )
    fabricante = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Fabricante",
    )

    class Meta:
        verbose_name = "Software"
        verbose_name_plural = "Software"
        ordering = ["nombre"]

    def __str__(self):
        """Devuelve nombre y fabricante si existe, ej: 'AutoCAD (Autodesk)'."""
        if self.fabricante:
            return f"{self.nombre} ({self.fabricante})"
        return self.nombre


# ═══════════════════════════════════════════════
#  ORGANIZACION
# ═══════════════════════════════════════════════

class Area(models.Model):
    """
    Gerencias o divisiones de la empresa (ej: CP Iluminacion, Gcia Energia).
    Se sincroniza automáticamente desde los sub-OUs de OU_DEPTOS en Active Directory.
    """
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre del area",
    )
    descripcion = models.TextField(
        blank=True,
        default="",
        verbose_name="Descripcion",
    )
    # DN del OU en AD para correlacionar en el sync
    ldap_ou_dn = models.TextField(
        blank=True,
        default="",
        verbose_name="OU Distinguished Name (AD)",
        help_text="DN completo de la OU en Active Directory. Se llena automaticamente.",
    )

    class Meta:
        verbose_name = "Area"
        verbose_name_plural = "Areas"
        ordering = ["nombre"]

    def __str__(self):
        """Devuelve el nombre del área, ej: 'CP Iluminación'."""
        return self.nombre

    @property
    def cantidad_empleados(self):
        """Retorna el número de empleados activos asignados a esta área."""
        return self.empleados.filter(activo=True).count()


# ── Centro de Costo ────────────────────────────────────────────────────────

class TipoCentroCosto(models.TextChoices):
    LINEA          = "LINEA",          "Línea de Transmisión"
    SUBESTACION    = "SUBESTACION",    "Subestación"
    ADMINISTRACION = "ADMINISTRACION", "Administración"
    OPERACION      = "OPERACION",      "Operación"
    OTRO           = "OTRO",           "Otro"


class CentroCosto(models.Model):
    """
    Obra o unidad a la que se carga el costo de los equipos asignados.
    Cada centro de costo pertenece a un área.
    Ejemplos: CC-ILU-001 / L.T. 220kV Polpaico-Cerro Navia · tipo: LINEA
    """
    codigo = models.CharField(
        max_length=30,
        unique=True,
        verbose_name="Código",
        help_text="Ej: CC-ILU-001",
    )
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre / Descripción de la obra",
    )
    tipo = models.CharField(
        max_length=20,
        choices=TipoCentroCosto.choices,
        default=TipoCentroCosto.OTRO,
        verbose_name="Tipo de obra",
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.PROTECT,
        related_name="centros_costo",
        verbose_name="Área",
    )
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Desmarque si la obra ya terminó.",
    )
    descripcion = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )

    # Historial silencioso para seguimiento interno
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Centro de Costo"
        verbose_name_plural = "Centros de Costo"
        ordering = ["area__nombre", "codigo"]

    def __str__(self):
        """Devuelve código y nombre del CC, ej: 'CC-ILU-001 — L.T. 220kV Polpaico'."""
        return f"{self.codigo} — {self.nombre}"


class Empleado(models.Model):
    """
    Registro de empleados del inventario.
    Representa personas de la organizacion, no usuarios del sistema.
    Un empleado puede existir sin tener cuenta en la app (personal de terreno).
    Se sincroniza con Active Directory via ldap_object_guid.
    REGLA: Nunca se borra, solo se marca activo=False.
    """
    numero_documento = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numero de documento",
        help_text="Cedula de identidad (C.C.) - identificador de RR.HH.",
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Username (AD)",
        help_text="sAMAccountName de Active Directory.",
    )
    first_name = models.CharField(
        max_length=100,
        default="",
        blank=True,
        verbose_name="Nombre",
        help_text="givenName de Active Directory.",
    )
    last_name = models.CharField(
        max_length=100,
        default="",
        blank=True,
        verbose_name="Apellido",
        help_text="sn (surname) de Active Directory.",
    )
    cargo = models.CharField(
        max_length=150,
        blank=True,
        default="",
        verbose_name="Cargo o puesto",
        help_text="Se ingresa manualmente en la app. No se sincroniza desde AD.",
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Correo electrónico",
        help_text="Opcional. Se registra en la app al enviar el primer acta. "
                  "No se sincroniza desde Active Directory.",
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="empleados",
        verbose_name="Area",
        help_text="Se asigna automáticamente según la OU de Active Directory.",
    )
    centro_costo = models.ForeignKey(
        "CentroCosto",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="empleados",
        verbose_name="Centro de Costo / Obra",
        help_text="Obra a la que se cargan los equipos asignados a este empleado.",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="empleado_perfil",
        verbose_name="Cuenta de usuario",
        help_text="Vincula al empleado con su cuenta Django. "
                  "Opcional: empleados de terreno pueden no tener cuenta.",
    )
    activo = models.BooleanField(
        default=True,
        verbose_name="Empleado activo",
        help_text="Desmarque si el empleado ya no trabaja en la empresa.",
    )
    fecha_desactivacion = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de desactivacion",
        help_text="Fecha en que el empleado fue marcado como inactivo.",
    )

    # --- Campos de sincronizacion LDAP ---
    ldap_object_guid = models.CharField(
        max_length=40,
        unique=True,
        null=True,
        blank=True,
        verbose_name="objectGUID (AD)",
        help_text="Identificador permanente en Active Directory. "
                  "Nunca cambia aunque el usuario sea renombrado o movido.",
    )
    ldap_dn = models.TextField(
        blank=True,
        default="",
        verbose_name="Distinguished Name (AD)",
        help_text="DN completo en AD, util para saber la OU.",
    )

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        """Devuelve nombre completo y cargo si existe, ej: 'Juan Pérez (Electricista)'."""
        full = self.get_full_name()
        if self.cargo:
            return f"{full} ({self.cargo})"
        return full

    def get_full_name(self):
        """Concatena first_name y last_name eliminando espacios sobrantes. Retorna '' si ambos están vacíos."""
        return f"{self.first_name} {self.last_name}".strip()


# ═══════════════════════════════════════════════
#  EQUIPOS
# ═══════════════════════════════════════════════

class EstadoEquipo(models.TextChoices):
    """Opciones de estado compartidas por Computador, Celular y Monitor."""
    EN_USO = "EN_USO", "En Uso"
    EN_BODEGA = "EN_BODEGA", "En Bodega"
    EN_REPARACION = "EN_REPARACION", "En Reparacion"
    PENDIENTE_DEVOLUCION = "PENDIENTE_DEVOLUCION", "Pendiente Devolucion"
    DE_BAJA = "DE_BAJA", "De Baja"


class TipoComputador(models.TextChoices):
    LAPTOP = "LAPTOP", "Laptop"
    DESKTOP = "DESKTOP", "Desktop"
    ALL_IN_ONE = "ALL_IN_ONE", "All-in-One"
    WORKSTATION = "WORKSTATION", "Workstation"


class TipoCelular(models.TextChoices):
    SMARTPHONE = "SMARTPHONE", "Smartphone"
    TABLET = "TABLET", "Tablet"


class Computador(models.Model):
    """
    Registro de equipos de computo del inventario.
    Incluye laptops, desktops, all-in-one y workstations.
    (Antes llamado 'Laptop'; renombrado para cubrir todos los tipos.)
    """
    numero_inventario = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Numero de inventario",
        help_text="Identificador fisico del activo (ej: ELEQ-1600).",
    )
    numero_serie = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Numero de serie",
    )
    tipo_equipo = models.CharField(
        max_length=20,
        choices=TipoComputador.choices,
        default=TipoComputador.LAPTOP,
        verbose_name="Tipo de equipo",
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.PROTECT,
        related_name="computadores",
        verbose_name="Marca",
    )
    modelo = models.ForeignKey(
        Modelo,
        on_delete=models.PROTECT,
        related_name="computadores",
        verbose_name="Modelo",
    )
    procesador = models.ForeignKey(
        Procesador,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="computadores",
        verbose_name="Procesador",
    )
    ram = models.ForeignKey(
        Ram,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="computadores",
        verbose_name="RAM",
    )
    numero_sticks_ram = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Cantidad de modulos RAM",
    )
    almacenamiento = models.ForeignKey(
        Almacenamiento,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="computadores",
        verbose_name="Almacenamiento",
    )
    sistema_operativo = models.ForeignKey(
        SistemaOperativo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="computadores",
        verbose_name="Sistema operativo",
    )
    estado = models.CharField(
        max_length=25,
        choices=EstadoEquipo.choices,
        default=EstadoEquipo.EN_BODEGA,
        verbose_name="Estado",
    )
    en_inventario = models.BooleanField(
        default=True,
        verbose_name="En inventario",
        help_text="Indica si el equipo esta fisicamente en las instalaciones. "
                  "Un equipo puede estar EN_USO pero no en inventario (en obra).",
    )
    empleado_asignado = models.ForeignKey(
        Empleado,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="computadores",
        verbose_name="Empleado asignado",
        help_text="Dejar en blanco si el equipo esta en bodega.",
    )
    fecha_ingreso = models.DateField(
        auto_now_add=True,
        verbose_name="Fecha de ingreso",
    )
    accesorios = models.TextField(
        blank=True,
        default="",
        verbose_name="Accesorios",
        help_text="Cargador, mouse, maletin, etc.",
    )
    comentario = models.TextField(
        blank=True,
        default="",
        verbose_name="Comentario",
    )
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )

    # Registro historico de cambios (simple-history)
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Computador"
        verbose_name_plural = "Computadores"
        ordering = ["-fecha_ingreso"]

    def __str__(self):
        """Devuelve tipo, marca, modelo y N° de inventario, ej: 'Laptop HP EliteBook — INV: ELEQ-1600'."""
        return (
            f"{self.get_tipo_equipo_display()} {self.marca} {self.modelo} "
            f"— INV: {self.numero_inventario}"
        )


class Celular(models.Model):
    """Registro de celulares y tablets del inventario."""
    numero_linea = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numero de linea",
        help_text="Numero telefonico de la linea asignada.",
    )
    imei = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        verbose_name="IMEI",
    )
    numero_serie = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numero de serie",
    )
    tipo_equipo = models.CharField(
        max_length=15,
        choices=TipoCelular.choices,
        default=TipoCelular.SMARTPHONE,
        verbose_name="Tipo de equipo",
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="Marca",
    )
    modelo = models.ForeignKey(
        Modelo,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="Modelo",
    )
    ram = models.ForeignKey(
        Ram,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="celulares",
        verbose_name="RAM",
    )
    almacenamiento = models.ForeignKey(
        Almacenamiento,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="celulares",
        verbose_name="Almacenamiento",
    )
    estado = models.CharField(
        max_length=25,
        choices=EstadoEquipo.choices,
        default=EstadoEquipo.EN_BODEGA,
        verbose_name="Estado",
    )
    empleado_asignado = models.ForeignKey(
        Empleado,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="celulares",
        verbose_name="Empleado asignado",
        help_text="Dejar en blanco si el equipo esta en bodega.",
    )
    fecha_ingreso = models.DateField(
        auto_now_add=True,
        verbose_name="Fecha de ingreso",
    )
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )

    # Registro historico de cambios (simple-history)
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Celular"
        verbose_name_plural = "Celulares"
        ordering = ["-fecha_ingreso"]

    def __str__(self):
        """Devuelve tipo, marca, modelo y el mejor identificador disponible (línea, IMEI, serie o pk)."""
        ident = self.numero_linea or self.imei or self.numero_serie or f"#{self.pk}"
        return f"{self.get_tipo_equipo_display()} {self.marca} {self.modelo} — {ident}"


# ── Chip / SIM ─────────────────────────────────────────────────────────────

class OperadorMovil(models.TextChoices):
    ENTEL    = "ENTEL",    "Entel"
    MOVISTAR = "MOVISTAR", "Movistar"
    CLARO    = "CLARO",    "Claro"
    WOM      = "WOM",      "WOM"
    OTRO     = "OTRO",     "Otro"


class EstadoChip(models.TextChoices):
    EN_USO     = "EN_USO",     "En Uso"
    EN_BODEGA  = "EN_BODEGA",  "En Bodega"
    SUSPENDIDA = "SUSPENDIDA", "Línea Suspendida"
    DE_BAJA    = "DE_BAJA",    "De Baja"


class Chip(models.Model):
    """
    Chip/SIM como activo independiente del teléfono.
    Un chip puede asignarse a un empleado con o sin equipo físico.
    Si está insertado en un celular, se registra la relación mediante el FK celular.
    """
    numero_linea = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Número de línea",
        help_text="Ej: 56987452398",
    )
    operador = models.CharField(
        max_length=20,
        choices=OperadorMovil.choices,
        default=OperadorMovil.ENTEL,
        verbose_name="Operador",
    )
    iccid = models.CharField(
        max_length=25,
        unique=True,
        null=True,
        blank=True,
        verbose_name="ICCID",
        help_text="Número físico impreso en el SIM (19-20 dígitos).",
    )
    plan = models.CharField(
        max_length=150,
        blank=True,
        default="",
        verbose_name="Plan contratado",
        help_text="Ej: Plan Empresas 10GB",
    )
    celular = models.ForeignKey(
        Celular,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chips",
        verbose_name="Teléfono donde está insertado",
        help_text="Opcional. Dejar vacío si el chip está en bodega o se entrega solo.",
    )
    empleado_asignado = models.ForeignKey(
        Empleado,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="chips",
        verbose_name="Empleado asignado",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoChip.choices,
        default=EstadoChip.EN_BODEGA,
        verbose_name="Estado",
    )
    fecha_ingreso = models.DateField(
        auto_now_add=True,
        verbose_name="Fecha de ingreso",
    )
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Chip / SIM"
        verbose_name_plural = "Chips / SIMs"
        ordering = ["operador", "numero_linea"]

    def __str__(self):
        """Devuelve operador y número de línea, ej: 'Entel — 56987452398'."""
        return f"{self.get_operador_display()} — {self.numero_linea}"


class Monitor(models.Model):
    """Registro de monitores/pantallas del inventario."""
    numero_inventario = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numero de inventario",
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monitores",
        verbose_name="Marca",
    )
    modelo = models.ForeignKey(
        Modelo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monitores",
        verbose_name="Modelo",
    )
    numero_serie = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numero de serie",
    )
    estado = models.CharField(
        max_length=25,
        choices=EstadoEquipo.choices,
        default=EstadoEquipo.EN_BODEGA,
        verbose_name="Estado",
    )
    computador = models.ForeignKey(
        Computador,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monitores",
        verbose_name="Computador conectado",
        help_text="Equipo al que esta fisicamente conectado.",
    )
    centro_costo = models.ForeignKey(
        "CentroCosto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monitores",
        verbose_name="Centro de Costo / Obra asignada",
    )
    fecha_ingreso = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de ingreso",
    )
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )

    class Meta:
        verbose_name = "Monitor"
        verbose_name_plural = "Monitores"
        ordering = ["-fecha_ingreso"]

    def __str__(self):
        """Devuelve 'Monitor Marca Modelo — identificador', usando el mejor ID disponible."""
        ident = self.numero_inventario or self.numero_serie or f"#{self.pk}"
        marca = self.marca or ""
        modelo = self.modelo or ""
        return f"Monitor {marca} {modelo} — {ident}".strip()


# ═══════════════════════════════════════════════
#  PERFIL DE USUARIO (Rol + CC asignado)
# ═══════════════════════════════════════════════

class RolUsuario(models.TextChoices):
    ADMIN          = "ADMIN",          "Administrador"
    ENCARGADO_OBRA = "ENCARGADO_OBRA", "Encargado de Obra"
    VIEWER         = "VIEWER",         "Solo Lectura"


class PerfilUsuario(models.Model):
    """
    Extiende auth.User con rol y Centro de Costo asignado.
    Se crea automáticamente al crear un User vía la señal post_save.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
        verbose_name="Usuario",
    )
    rol = models.CharField(
        max_length=20,
        choices=RolUsuario.choices,
        default=RolUsuario.VIEWER,
        verbose_name="Rol",
    )
    centro_costo = models.ForeignKey(
        "CentroCosto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usuarios_encargados",
        verbose_name="Centro de Costo asignado",
        help_text="Solo aplica para rol Encargado de Obra.",
    )

    class Meta:
        verbose_name = "Perfil de usuario"
        verbose_name_plural = "Perfiles de usuario"

    def __str__(self):
        """Devuelve username y rol, ej: 'jperez — Encargado de Obra'."""
        return f"{self.user.username} — {self.get_rol_display()}"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    """Crea automáticamente un PerfilUsuario al registrar un nuevo User."""
    if created:
        rol = RolUsuario.ADMIN if (instance.is_staff or instance.is_superuser) else RolUsuario.VIEWER
        PerfilUsuario.objects.get_or_create(user=instance, defaults={"rol": rol})


# ═══════════════════════════════════════════════

class ComputadorSoftware(models.Model):
    """Tabla intermedia: software instalado en un computador."""
    computador = models.ForeignKey(
        Computador,
        on_delete=models.CASCADE,
        related_name="software_instalado",
        verbose_name="Computador",
    )
    software = models.ForeignKey(
        Software,
        on_delete=models.PROTECT,
        related_name="instalaciones",
        verbose_name="Software",
    )
    version = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Version",
    )
    fecha_instalacion = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de instalacion",
    )

    class Meta:
        verbose_name = "Software instalado"
        verbose_name_plural = "Software instalado"
        unique_together = [("computador", "software")]
        ordering = ["software__nombre"]

    def __str__(self):
        """Devuelve software con versión y el N° de inventario del equipo, ej: 'AutoCAD v2024 en ELEQ-1600'."""
        v = f" v{self.version}" if self.version else ""
        return f"{self.software.nombre}{v} en {self.computador.numero_inventario}"


# ═══════════════════════════════════════════════
#  SOLICITUDES DE CORREO ELECTRÓNICO
# ═══════════════════════════════════════════════

class TipoSolicitudCorreo(models.TextChoices):
    ALTA = "ALTA", "Alta (crear correo)"
    BAJA = "BAJA", "Baja (eliminar correo)"


class EstadoSolicitudCorreo(models.TextChoices):
    PENDIENTE    = "PENDIENTE",    "Pendiente"
    ENVIADO_CAU  = "ENVIADO_CAU",  "Enviado a CAU"
    COMPLETADO   = "COMPLETADO",   "Completado"
    RECHAZADO    = "RECHAZADO",    "Rechazado"


class SolicitudCorreo(models.Model):
    """
    Registro de solicitudes de alta o baja de cuentas de correo corporativo.
    Flujo: PENDIENTE → ENVIADO_CAU → COMPLETADO (o RECHAZADO).
    Al crear una solicitud se envía notificación automática al equipo de TI.
    """

    # ── Tipo y estado ──────────────────────────────────────────
    tipo = models.CharField(
        max_length=10,
        choices=TipoSolicitudCorreo.choices,
        verbose_name="Tipo de solicitud",
    )
    estado = models.CharField(
        max_length=15,
        choices=EstadoSolicitudCorreo.choices,
        default=EstadoSolicitudCorreo.PENDIENTE,
        verbose_name="Estado",
    )

    # ── Datos del empleado ─────────────────────────────────────
    empleado_nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre completo del empleado",
    )
    empleado_rut = models.CharField(
        max_length=12,
        verbose_name="RUT del empleado",
        help_text="Ej: 12.345.678-9",
    )
    empleado_cargo = models.CharField(
        max_length=150,
        verbose_name="Cargo",
    )
    centro_costo = models.ForeignKey(
        "CentroCosto",
        on_delete=models.PROTECT,
        related_name="solicitudes_correo",
        verbose_name="Centro de Costo / Obra",
    )

    # ── Fechas ────────────────────────────────────────────────
    fecha_requerida = models.DateField(
        verbose_name="Fecha requerida",
        help_text="Fecha desde cuando necesita el correo (alta) o hasta cuando (baja).",
    )

    # ── Gestión interna TI ─────────────────────────────────────
    numero_ticket_cau = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="N° Ticket CAU",
        help_text="Número asignado por el CAU de España al enviar la solicitud.",
    )
    link_solicitud_cau = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Link solicitud CAU",
        help_text="URL directa a la solicitud en el portal CAU de España.",
    )
    observaciones = models.TextField(
        blank=True,
        default="",
        verbose_name="Observaciones",
    )

    # ── Auditoría ──────────────────────────────────────────────
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="solicitudes_correo",
        verbose_name="Registrado por",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de registro")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última modificación")
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Solicitud de correo"
        verbose_name_plural = "Solicitudes de correo"
        ordering = ["-created_at"]

    def __str__(self):
        """Devuelve tipo, nombre del empleado y estado, ej: 'ALTA — Juan Pérez (PENDIENTE)'."""
        return f"{self.tipo} — {self.empleado_nombre} ({self.estado})"

    def enviar_notificacion_email(self):
        """
        Envía un correo de notificación al equipo de TI con los datos de la solicitud.
        Se llama automáticamente desde la señal post_save al crear la solicitud.
        Usa el backend de email configurado en settings (Gmail SMTP).
        """
        tipo_label  = self.get_tipo_display()
        estado_label = self.get_estado_display()
        asunto = f"[TI Inventario] Nueva solicitud de {tipo_label} — {self.empleado_nombre}"
        cuerpo = f"""
Nueva solicitud registrada en el sistema de inventario TI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS DE LA SOLICITUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo          : {tipo_label}
Estado        : {estado_label}
Registrada por: {self.solicitante.get_full_name() or self.solicitante.username}
Fecha registro: {self.created_at.strftime("%d/%m/%Y %H:%M") if self.created_at else "—"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS DEL EMPLEADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre        : {self.empleado_nombre}
RUT           : {self.empleado_rut}
Cargo         : {self.empleado_cargo}
Centro Costo  : {self.centro_costo}
Fecha requerida: {self.fecha_requerida.strftime("%d/%m/%Y") if self.fecha_requerida else "—"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRÓXIMOS PASOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Ingresar al sistema de inventario TI
2. Abrir la solicitud y enviar al CAU de España
3. Registrar el N° de ticket CAU en el sistema
4. Actualizar el estado cuando se complete

Este es un mensaje automático — no responder a este correo.
        """.strip()

        destinatarios = getattr(settings, "TI_EMAIL_NOTIFICACIONES", [])
        if not destinatarios:
            return

        try:
            msg = EmailMessage(
                subject=asunto,
                body=cuerpo,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=destinatarios if isinstance(destinatarios, list) else [destinatarios],
            )
            msg.send(fail_silently=True)
        except Exception:
            pass


@receiver(post_save, sender=SolicitudCorreo)
def notificar_nueva_solicitud_correo(sender, instance, created, **kwargs):
    """Envía email de notificación al equipo TI cuando se crea una nueva solicitud de correo."""
    if created:
        instance.enviar_notificacion_email()
