from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class RegistroCambio(models.Model):
    ACCION_CHOICES = [
        ('CREACION', 'Creación'),
        ('ACTUALIZACION', 'Actualización'),
        ('ELIMINACION', 'Eliminación'),
        ('CAMBIO_ESTADO', 'Cambio de Estado'),
    ]

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name='Tipo de objeto',
    )
    object_id = models.PositiveIntegerField(verbose_name='ID del objeto')
    content_object = GenericForeignKey('content_type', 'object_id')

    accion = models.CharField(
        max_length=20,
        choices=ACCION_CHOICES,
        verbose_name='Acción',
    )
    campo = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Campo modificado',
    )
    valor_anterior = models.TextField(
        blank=True,
        null=True,
        verbose_name='Valor anterior',
    )
    valor_nuevo = models.TextField(
        blank=True,
        null=True,
        verbose_name='Valor nuevo',
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción',
    )

    usuario = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name='Usuario',
    )
    direccion_ip = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name='Dirección IP',
    )

    fecha = models.DateTimeField(auto_now_add=True, verbose_name='Fecha')

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Registro de cambio'
        verbose_name_plural = 'Registros de cambios'
        indexes = [
            models.Index(fields=['-fecha']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['accion']),
        ]

    def __str__(self):
        return (
            f"[{self.get_accion_display()}] "
            f"{self.content_type.model} #{self.object_id} — "
            f"{self.fecha:%d/%m/%Y %H:%M}"
        )