"""
Modelos para el registro de sincronizaciones LDAP.
"""

from django.db import models


class SyncLog(models.Model):
    """Registro de cada ejecucion de sincronizacion con Active Directory."""

    class EstadoSync(models.TextChoices):
        EXITOSO = "exitoso", "Exitoso"
        PARCIAL = "parcial", "Parcial (con errores)"
        FALLIDO = "fallido", "Fallido"

    class TipoSync(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTOMATICO = "AUTOMATICO", "Automatico"
        PROGRAMADO = "PROGRAMADO", "Programado"

    fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de ejecucion")
    tipo_sync = models.CharField(
        max_length=15,
        choices=TipoSync.choices,
        default=TipoSync.MANUAL,
        verbose_name="Tipo de sincronizacion",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoSync.choices,
        verbose_name="Estado",
    )
    empleados_creados = models.PositiveIntegerField(default=0, verbose_name="Empleados creados")
    empleados_actualizados = models.PositiveIntegerField(default=0, verbose_name="Empleados actualizados")
    empleados_desactivados = models.PositiveIntegerField(default=0, verbose_name="Empleados desactivados")
    empleados_protegidos = models.PositiveIntegerField(
        default=0,
        verbose_name="Empleados protegidos",
        help_text="Empleados que el sync intento desactivar pero no pudo "
                  "porque tienen equipos asignados (PROTECT).",
    )
    errores = models.TextField(blank=True, default="", verbose_name="Errores")
    duracion_segundos = models.FloatField(default=0, verbose_name="Duracion (segundos)")
    ejecutado_por = models.CharField(
        max_length=150,
        blank=True,
        default="sistema",
        verbose_name="Ejecutado por",
    )

    class Meta:
        verbose_name = "Registro de sincronizacion LDAP"
        verbose_name_plural = "Registros de sincronizacion LDAP"
        ordering = ["-fecha"]

    def __str__(self):
        return f"Sync {self.fecha:%d/%m/%Y %H:%M} - {self.get_estado_display()}"


class LDAPMapping(models.Model):
    """
    Mapeo configurable de atributos LDAP a campos del modelo Empleado.
    Permite personalizar la correspondencia sin tocar codigo.
    """
    atributo_ldap = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Atributo LDAP",
        help_text="Nombre del atributo en Active Directory (ej: sAMAccountName, department).",
    )
    campo_empleado = models.CharField(
        max_length=100,
        verbose_name="Campo del empleado",
        help_text="Campo del modelo Empleado (ej: username, cargo).",
    )
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Mapeo LDAP"
        verbose_name_plural = "Mapeos LDAP"
        ordering = ["atributo_ldap"]

    def __str__(self):
        return f"{self.atributo_ldap} -> {self.campo_empleado}"
