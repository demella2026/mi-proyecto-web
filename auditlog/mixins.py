from django.contrib.contenttypes.models import ContentType

from auditlog.models import RegistroCambio
from auditlog.middleware import get_current_user, get_current_ip


class AuditModelMixin:
    """
    Mixin que registra automáticamente creación, actualización y eliminación
    de cualquier modelo que lo herede.

    Uso:
        class MiModelo(AuditModelMixin, models.Model):
            audit_exclude_fields = ['updated_at']   # opcional
            ...

    IMPORTANTE: AuditModelMixin debe ir ANTES de models.Model en la herencia.
    """

    audit_exclude_fields = []

    # ------------------------------------------------------------------
    # SAVE
    # ------------------------------------------------------------------
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_instance = None

        if not is_new:
            try:
                old_instance = self.__class__.objects.get(pk=self.pk)
            except self.__class__.DoesNotExist:
                is_new = True

        super().save(*args, **kwargs)

        ct = ContentType.objects.get_for_model(self)
        usuario = get_current_user()
        ip = get_current_ip()

        if is_new:
            RegistroCambio.objects.create(
                content_type=ct,
                object_id=self.pk,
                accion='CREACION',
                descripcion=f'Se creó {self._meta.verbose_name}: {self}',
                usuario=usuario,
                direccion_ip=ip,
            )
        else:
            self._registrar_cambios(old_instance, ct, usuario, ip)

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------
    def delete(self, *args, **kwargs):
        ct = ContentType.objects.get_for_model(self)
        usuario = get_current_user()
        ip = get_current_ip()

        RegistroCambio.objects.create(
            content_type=ct,
            object_id=self.pk,
            accion='ELIMINACION',
            descripcion=f'Se eliminó {self._meta.verbose_name}: {self}',
            usuario=usuario,
            direccion_ip=ip,
        )
        super().delete(*args, **kwargs)

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------
    def _registrar_cambios(self, old_instance, ct, usuario, ip):
        exclude = set(self.audit_exclude_fields) | {'id'}

        for field in self._meta.fields:
            if field.name in exclude:
                continue

            if field.is_relation:
                old_val = getattr(old_instance, f'{field.name}_id', None)
                new_val = getattr(self, f'{field.name}_id', None)
            else:
                old_val = getattr(old_instance, field.name, None)
                new_val = getattr(self, field.name, None)

            if old_val != new_val:
                old_display = self._display(old_instance, field)
                new_display = self._display(self, field)
                campo_label = str(
                    field.verbose_name if hasattr(field, 'verbose_name') else field.name
                )
                accion = (
                    'CAMBIO_ESTADO' if field.name == 'estado' else 'ACTUALIZACION'
                )

                RegistroCambio.objects.create(
                    content_type=ct,
                    object_id=self.pk,
                    accion=accion,
                    campo=campo_label,
                    valor_anterior=str(old_display),
                    valor_nuevo=str(new_display),
                    descripcion=f'{campo_label}: "{old_display}" → "{new_display}"',
                    usuario=usuario,
                    direccion_ip=ip,
                )

    @staticmethod
    def _display(instance, field):
        """Devuelve el valor legible de un campo."""
        if field.is_relation:
            obj = getattr(instance, field.name, None)
            return str(obj) if obj else 'N/A'

        value = getattr(instance, field.name, None)
        if field.choices:
            return dict(field.choices).get(value, str(value) if value is not None else 'N/A')
        return str(value) if value is not None else 'N/A'