"""
Modelos para las Actas de Entrega de equipos.
Incluye soporte para firma digital certificada y firma simple (imagen).
"""

import uuid
from django.conf import settings
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class EstadoActa(models.TextChoices):
    BORRADOR = "borrador", "Borrador"
    PENDIENTE_FIRMA = "pendiente_firma", "Pendiente de Firma"
    FIRMADA = "firmada", "Firmada"
    ANULADA = "anulada", "Anulada"


class TipoActa(models.TextChoices):
    ENTREGA = "entrega", "Entrega de Equipo"
    DEVOLUCION = "devolucion", "Devolucion de Equipo"
    CAMBIO = "cambio", "Cambio de Equipo"


class ActaEntrega(models.Model):
    """
    Acta de entrega/devolucion de un equipo a un empleado.
    Se genera automaticamente via post_save signal cuando
    empleado_asignado cambia de null a un ID de empleado.
    """

    # ---------- Identificador unico ----------
    numero_acta = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Numero de acta",
        help_text="Generado automaticamente (formato: ACTA-YYYYMMDD-XXXX).",
    )

    # ---------- Relacion generica al equipo ----------
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name="Tipo de equipo",
        limit_choices_to={"model__in": ("computador", "celular", "monitor", "chip")},
    )
    object_id = models.PositiveIntegerField(verbose_name="ID del equipo")
    equipo = GenericForeignKey("content_type", "object_id")

    # ---------- Datos del acta ----------
    tipo_acta = models.CharField(
        max_length=20,
        choices=TipoActa.choices,
        default=TipoActa.ENTREGA,
        verbose_name="Tipo de acta",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoActa.choices,
        default=EstadoActa.PENDIENTE_FIRMA,
        verbose_name="Estado del acta",
    )

    # ---------- Personas involucradas ----------
    empleado = models.ForeignKey(
        "inventory.Empleado",
        on_delete=models.PROTECT,
        related_name="actas_entrega",
        verbose_name="Empleado receptor",
    )
    responsable_ti = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="actas_gestionadas",
        verbose_name="Responsable TI",
    )

    # ---------- Detalle del equipo al momento de la entrega ----------
    detalle_equipo = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Detalle del equipo",
        help_text="Snapshot de las specs del equipo al momento de la entrega.",
    )

    # ---------- Observaciones ----------
    observaciones = models.TextField(
        blank=True,
        default="",
        verbose_name="Observaciones",
        help_text="Estado fisico del equipo, accesorios entregados, etc.",
    )
    accesorios = models.TextField(
        blank=True,
        default="",
        verbose_name="Accesorios entregados",
        help_text="Cargador, mouse, maletin, etc.",
    )
    condiciones_uso = models.TextField(
        blank=True,
        default="El empleado se compromete a utilizar el equipo entregado "
                "exclusivamente para actividades laborales, a mantenerlo en "
                "buen estado y a reportar cualquier dano o perdida de manera "
                "inmediata al area de TI.",
        verbose_name="Condiciones de uso",
    )

    # ---------- Firma simple (imagen canvas) ----------
    firma_empleado_imagen = models.TextField(
        blank=True,
        default="",
        verbose_name="Firma del empleado (base64)",
        help_text="Imagen de la firma capturada desde un canvas en el frontend.",
    )
    firma_responsable_imagen = models.TextField(
        blank=True,
        default="",
        verbose_name="Firma del responsable TI (base64)",
    )

    # ---------- Firma digital certificada ----------
    firma_digital_hash = models.CharField(
        max_length=512,
        blank=True,
        default="",
        verbose_name="Hash de firma digital",
        help_text="Hash SHA-256 del documento firmado digitalmente.",
    )
    certificado_serial = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Serial del certificado",
    )
    firma_digital_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Timestamp de la firma digital",
    )
    firma_digital_valida = models.BooleanField(
        default=False,
        verbose_name="Firma digital valida",
    )

    # ---------- Archivo PDF ----------
    archivo_pdf = models.FileField(
        upload_to="actas/pdf/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="Archivo PDF",
    )

    # ---------- Fechas ----------
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creacion",
    )
    fecha_firma = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de firma",
    )

    class Meta:
        verbose_name = "Acta de entrega"
        verbose_name_plural = "Actas de entrega"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=["-fecha_creacion"]),
            models.Index(fields=["numero_acta"]),
            models.Index(fields=["estado"]),
            models.Index(fields=["empleado"]),
        ]

    def __str__(self):
        return f"{self.numero_acta} - {self.empleado.get_full_name()}"

    @staticmethod
    def generar_numero_acta():
        """Genera un numero de acta unico con formato ACTA-YYYYMMDD-XXXX."""
        from django.utils import timezone
        hoy = timezone.now()
        prefijo = f"ACTA-{hoy.strftime('%Y%m%d')}"
        # Contar actas de hoy para el consecutivo
        cuenta = ActaEntrega.objects.filter(
            numero_acta__startswith=prefijo
        ).count()
        return f"{prefijo}-{cuenta + 1:04d}"

    def capturar_detalle_equipo(self):
        """Guarda un snapshot de las especificaciones actuales del equipo."""
        equipo = self.equipo
        if equipo is None:
            return

        detalle = {
            "tipo": self.content_type.model,
            "numero_serie": getattr(equipo, "numero_serie", ""),
            "marca": str(getattr(equipo, "marca", "")),
            "modelo": str(getattr(equipo, "modelo", "")),
            "ram": str(getattr(equipo, "ram", "")),
            "almacenamiento": str(getattr(equipo, "almacenamiento", "")),
            "estado": getattr(equipo, "estado", ""),
        }
        # Campos especificos de laptop
        if hasattr(equipo, "procesador"):
            detalle["procesador"] = str(equipo.procesador)
        # Campos especificos de celular
        if hasattr(equipo, "imei"):
            detalle["imei"] = equipo.imei

        self.detalle_equipo = detalle
