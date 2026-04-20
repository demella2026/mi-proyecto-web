"""
Signals para generar actas de entrega automaticamente.
Se dispara cuando el campo empleado_asignado cambia de null a un ID de empleado.
"""

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

from inventory.models import Computador, Celular, Monitor, Chip
from .models import ActaEntrega, TipoActa, EstadoActa


def _check_asignacion(sender, instance, **kwargs):
    """
    Verifica si empleado_asignado cambio de null a un empleado.
    Retorna (debe_crear_acta, tipo_acta, empleado).
    """
    if instance.pk is None:
        # Equipo nuevo: si ya tiene empleado asignado, crear acta
        if instance.empleado_asignado_id:
            return True, TipoActa.ENTREGA, instance.empleado_asignado
        return False, None, None

    try:
        original = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return False, None, None

    old_emp = original.empleado_asignado_id
    new_emp = instance.empleado_asignado_id

    if old_emp is None and new_emp is not None:
        # De sin asignar a asignado -> Entrega
        return True, TipoActa.ENTREGA, instance.empleado_asignado
    elif old_emp is not None and new_emp is None:
        # De asignado a sin asignar -> Devolucion
        return True, TipoActa.DEVOLUCION, original.empleado_asignado
    elif old_emp is not None and new_emp is not None and old_emp != new_emp:
        # Cambio de empleado -> Cambio
        return True, TipoActa.CAMBIO, instance.empleado_asignado

    return False, None, None


# ═══════════════════════════════════════════════
#  COMPUTADOR
# ═══════════════════════════════════════════════

@receiver(post_save, sender=Computador)
def crear_acta_computador(sender, instance, created, **kwargs):
    """Crea acta de entrega cuando un computador se asigna a un empleado."""
    if getattr(instance, "_skip_acta_signal", False):
        return

    if created and instance.empleado_asignado_id:
        _crear_acta(instance, TipoActa.ENTREGA, instance.empleado_asignado)
        return

    acta_info = getattr(instance, "_acta_info", None)
    if acta_info:
        debe_crear, tipo_acta, empleado = acta_info
        if debe_crear:
            _crear_acta(instance, tipo_acta, empleado)
        delattr(instance, "_acta_info")


@receiver(pre_save, sender=Computador)
def pre_save_computador_acta(sender, instance, **kwargs):
    """Guarda informacion de cambio de asignacion antes del save."""
    if getattr(instance, "_skip_acta_signal", False):
        return
    if not instance.pk:
        return
    instance._acta_info = _check_asignacion(sender, instance)


# ═══════════════════════════════════════════════
#  CELULAR
# ═══════════════════════════════════════════════

@receiver(post_save, sender=Celular)
def crear_acta_celular(sender, instance, created, **kwargs):
    """Crea acta de entrega cuando un celular se asigna a un empleado."""
    if getattr(instance, "_skip_acta_signal", False):
        return

    if created and instance.empleado_asignado_id:
        _crear_acta(instance, TipoActa.ENTREGA, instance.empleado_asignado)
        return

    acta_info = getattr(instance, "_acta_info", None)
    if acta_info:
        debe_crear, tipo_acta, empleado = acta_info
        if debe_crear:
            _crear_acta(instance, tipo_acta, empleado)
        delattr(instance, "_acta_info")


@receiver(pre_save, sender=Celular)
def pre_save_celular_acta(sender, instance, **kwargs):
    """Guarda informacion de cambio de asignacion antes del save."""
    if getattr(instance, "_skip_acta_signal", False):
        return
    if not instance.pk:
        return
    instance._acta_info = _check_asignacion(sender, instance)


# ═══════════════════════════════════════════════
#  MONITOR
# ═══════════════════════════════════════════════

@receiver(post_save, sender=Monitor)
def crear_acta_monitor(sender, instance, created, **kwargs):
    """Crea acta de entrega cuando un monitor se asigna a un empleado."""
    if getattr(instance, "_skip_acta_signal", False):
        return

    if created and instance.empleado_asignado_id:
        _crear_acta(instance, TipoActa.ENTREGA, instance.empleado_asignado)
        return

    acta_info = getattr(instance, "_acta_info", None)
    if acta_info:
        debe_crear, tipo_acta, empleado = acta_info
        if debe_crear:
            _crear_acta(instance, tipo_acta, empleado)
        delattr(instance, "_acta_info")


@receiver(pre_save, sender=Monitor)
def pre_save_monitor_acta(sender, instance, **kwargs):
    """Guarda informacion de cambio de asignacion antes del save."""
    if getattr(instance, "_skip_acta_signal", False):
        return
    if not instance.pk:
        return
    instance._acta_info = _check_asignacion(sender, instance)


# ═══════════════════════════════════════════════
#  CHIP / SIM
# ═══════════════════════════════════════════════

@receiver(post_save, sender=Chip)
def crear_acta_chip(sender, instance, created, **kwargs):
    """Crea acta de entrega cuando un chip se asigna a un empleado."""
    if getattr(instance, "_skip_acta_signal", False):
        return

    if created and instance.empleado_asignado_id:
        _crear_acta(instance, TipoActa.ENTREGA, instance.empleado_asignado)
        return

    acta_info = getattr(instance, "_acta_info", None)
    if acta_info:
        debe_crear, tipo_acta, empleado = acta_info
        if debe_crear:
            _crear_acta(instance, tipo_acta, empleado)
        delattr(instance, "_acta_info")


@receiver(pre_save, sender=Chip)
def pre_save_chip_acta(sender, instance, **kwargs):
    """Guarda informacion de cambio de asignacion antes del save."""
    if getattr(instance, "_skip_acta_signal", False):
        return
    if not instance.pk:
        return
    instance._acta_info = _check_asignacion(sender, instance)


# ═══════════════════════════════════════════════
#  HELPER
# ═══════════════════════════════════════════════

def _crear_acta(equipo, tipo_acta, empleado):
    """Crea un acta de entrega para el equipo dado."""
    ct = ContentType.objects.get_for_model(equipo)

    acta = ActaEntrega(
        numero_acta=ActaEntrega.generar_numero_acta(),
        content_type=ct,
        object_id=equipo.pk,
        tipo_acta=tipo_acta,
        estado=EstadoActa.PENDIENTE_FIRMA,
        empleado=empleado,
    )
    acta.capturar_detalle_equipo()
    acta.save()

    # Generar el PDF automaticamente
    from .pdf_generator import generar_pdf_acta
    try:
        generar_pdf_acta(acta)
    except Exception:
        # No romper el flujo si falla la generacion de PDF
        pass

    return acta
