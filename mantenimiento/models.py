"""
Modelos para la Bitacora Tecnica de Mantenimiento.
Registra intervenciones de mantenimiento preventivo y correctivo
sobre los equipos del inventario, con trazabilidad completa.
"""

from django.conf import settings
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class TipoMantenimiento(models.TextChoices):
    PREVENTIVO = "preventivo", "Preventivo"
    CORRECTIVO = "correctivo", "Correctivo"


class EstadoMantenimiento(models.TextChoices):
    PENDIENTE = "pendiente", "Pendiente"
    EN_PROCESO = "en_proceso", "En Proceso"
    COMPLETADO = "completado", "Completado"
    CANCELADO = "cancelado", "Cancelado"


class Mantenimiento(models.Model):
    """
    Registro de mantenimiento tecnico sobre un equipo (Computador, Celular o Monitor).
    Usa GenericForeignKey para poder relacionarse con cualquier modelo de equipo.
    """

    # ---------- Relacion generica al equipo ----------
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name="Tipo de equipo",
        limit_choices_to={"model__in": ("computador", "celular", "monitor", "chip")},
    )
    object_id = models.PositiveIntegerField(verbose_name="ID del equipo")
    equipo = GenericForeignKey("content_type", "object_id")

    # ---------- Datos del mantenimiento ----------
    tipo = models.CharField(
        max_length=20,
        choices=TipoMantenimiento.choices,
        verbose_name="Tipo de mantenimiento",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoMantenimiento.choices,
        default=EstadoMantenimiento.PENDIENTE,
        verbose_name="Estado",
    )
    descripcion = models.TextField(
        verbose_name="Descripcion del trabajo",
        help_text="Detalle de la intervencion realizada o por realizar.",
    )
    diagnostico = models.TextField(
        blank=True,
        default="",
        verbose_name="Diagnostico",
        help_text="Problema identificado antes de la intervencion.",
    )

    # ---------- Componentes cambiados ----------
    componentes_cambiados = models.TextField(
        blank=True,
        default="",
        verbose_name="Componentes cambiados",
        help_text="Lista de piezas reemplazadas (ej: RAM 8GB -> 16GB, SSD 256GB -> 512GB).",
    )
    actualizar_specs = models.BooleanField(
        default=False,
        verbose_name="Actualizar specs del equipo",
        help_text="Si es True, al completar el mantenimiento se actualizan "
                  "las especificaciones del equipo (RAM, Almacenamiento, etc.).",
    )
    nueva_ram = models.ForeignKey(
        "inventory.Ram",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="mantenimientos_ram",
        verbose_name="Nueva RAM (si aplica)",
    )
    nuevo_almacenamiento = models.ForeignKey(
        "inventory.Almacenamiento",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="mantenimientos_almacenamiento",
        verbose_name="Nuevo almacenamiento (si aplica)",
    )
    nuevo_procesador = models.ForeignKey(
        "inventory.Procesador",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="mantenimientos_procesador",
        verbose_name="Nuevo procesador (si aplica)",
    )

    # ---------- Costos ----------
    costo_repuestos = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Costo de repuestos",
    )
    costo_mano_obra = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Costo mano de obra",
    )

    # ---------- Responsable ----------
    tecnico_responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="mantenimientos_asignados",
        verbose_name="Tecnico responsable",
    )
    proveedor_externo = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="Proveedor externo",
        help_text="Nombre del proveedor si el mantenimiento fue tercerizado.",
    )

    # ---------- Fechas ----------
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creacion",
    )
    fecha_inicio = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de inicio del trabajo",
    )
    fecha_fin = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de finalizacion",
    )

    # ---------- Notas ----------
    notas = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas adicionales",
    )

    class Meta:
        verbose_name = "Mantenimiento"
        verbose_name_plural = "Mantenimientos"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=["-fecha_creacion"]),
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["tipo"]),
            models.Index(fields=["estado"]),
        ]

    def __str__(self):
        return (
            f"[{self.get_tipo_display()}] {self.content_type.model} "
            f"#{self.object_id} - {self.fecha_creacion:%d/%m/%Y}"
        )

    @property
    def costo_total(self):
        return self.costo_repuestos + self.costo_mano_obra

    def aplicar_cambios_specs(self):
        """
        Si actualizar_specs es True y el mantenimiento esta completado,
        actualiza las especificaciones del equipo asociado.
        """
        if not self.actualizar_specs or self.estado != EstadoMantenimiento.COMPLETADO:
            return False

        equipo = self.equipo
        if equipo is None:
            return False

        cambios = False
        if self.nueva_ram and hasattr(equipo, "ram"):
            equipo.ram = self.nueva_ram
            cambios = True
        if self.nuevo_almacenamiento and hasattr(equipo, "almacenamiento"):
            equipo.almacenamiento = self.nuevo_almacenamiento
            cambios = True
        if self.nuevo_procesador and hasattr(equipo, "procesador"):
            equipo.procesador = self.nuevo_procesador
            cambios = True

        if cambios:
            equipo.save()
        return cambios


class ArchivoMantenimiento(models.Model):
    """
    Archivos adjuntos (fotos antes/despues, documentos de soporte)
    asociados a un registro de mantenimiento.
    """

    class TipoArchivo(models.TextChoices):
        FOTO_ANTES = "foto_antes", "Foto antes"
        FOTO_DESPUES = "foto_despues", "Foto despues"
        DOCUMENTO = "documento", "Documento de soporte"
        OTRO = "otro", "Otro"

    mantenimiento = models.ForeignKey(
        Mantenimiento,
        on_delete=models.CASCADE,
        related_name="archivos",
        verbose_name="Mantenimiento",
    )
    archivo = models.FileField(
        upload_to="mantenimiento/archivos/%Y/%m/",
        verbose_name="Archivo",
    )
    tipo = models.CharField(
        max_length=20,
        choices=TipoArchivo.choices,
        default=TipoArchivo.OTRO,
        verbose_name="Tipo de archivo",
    )
    descripcion = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Descripcion",
    )
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de subida",
    )

    class Meta:
        verbose_name = "Archivo de mantenimiento"
        verbose_name_plural = "Archivos de mantenimiento"
        ordering = ["-fecha_subida"]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.archivo.name}"
