from django.apps import AppConfig


class ActasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "actas"
    verbose_name = "Actas de Entrega"

    def ready(self):
        import actas.signals  # noqa: F401
