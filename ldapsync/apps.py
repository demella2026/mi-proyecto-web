from django.apps import AppConfig


class LdapsyncConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ldapsync"
    verbose_name = "Sincronizacion LDAP / Active Directory"
