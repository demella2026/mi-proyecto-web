import os
from datetime import timedelta
from pathlib import Path
from decouple import config
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-cambiar-en-produccion-!k3y-s3cr3t4-d3f4ult",
)
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "django_filters",
    "corsheaders",
    "simple_history",
    # App propia
    "inventory",
    "auditlog",
    "exports",
    "mantenimiento",
    "actas",
    "ldapsync",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "auditlog.middleware.AuditMiddleware",
    'whitenoise.middleware.WhiteNoiseMiddleware',
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='inventario_db'),
        'USER': config('POSTGRES_USER', default='inventario_user'),
        'PASSWORD': config('POSTGRES_PASSWORD', default='inventario_pass'),
        'HOST': config('POSTGRES_HOST', default='localhost'),
        'PORT': config('POSTGRES_PORT', default='5432'),
    }
}

# Aprovechando decouple, modifica también tu SECRET_KEY y DEBUG si quieres:
SECRET_KEY = config('DJANGO_SECRET_KEY', default='clave-insegura-por-defecto')
DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='*').split(',')
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":  True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOW_ALL_ORIGINS = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ═══════════════════════════════════════════════
#  MEDIA FILES (PDFs de actas, archivos de mantenimiento)
# ═══════════════════════════════════════════════
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# ═══════════════════════════════════════════════
#  EMAIL — Envio de Actas de Entrega
# ═══════════════════════════════════════════════
# Para habilitar el envio de actas por email, configura en .env:
#   EMAIL_HOST_USER=tucuenta@gmail.com
#   EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx   (App Password de Google)
#   EMAIL_FROM_NAME=Inventario TI Elecnor
# Para generar un App Password en Google:
#   1. Ir a myaccount.google.com > Seguridad > Verificacion en 2 pasos
#   2. Al final de esa pagina: "Contrasenas de aplicaciones"
#   3. Crear una para "Correo / Otro (nombre personalizado)"

EMAIL_BACKEND    = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST       = config("EMAIL_HOST",    default="smtp.gmail.com")
EMAIL_PORT       = config("EMAIL_PORT",    default=587, cast=int)
EMAIL_USE_TLS    = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER  = config("EMAIL_HOST_USER",  default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_FROM_NAME  = config("EMAIL_FROM_NAME", default="Inventario TI")
DEFAULT_FROM_EMAIL = f"{EMAIL_FROM_NAME} <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "noreply@inventario.local"

# Destinatarios de notificaciones automáticas de solicitudes de correo.
# Puede ser un string (un solo correo) o una lista separada por comas en .env.
_ti_emails_raw = config("TI_EMAIL_NOTIFICACIONES", default="")
TI_EMAIL_NOTIFICACIONES = [e.strip() for e in _ti_emails_raw.split(",") if e.strip()]

# ═══════════════════════════════════════════════
#  LDAP / Active Directory (Opcional)
# ═══════════════════════════════════════════════
# Para habilitar autenticacion LDAP, configura las variables de entorno:
#   LDAP_SERVER_URI, LDAP_BIND_DN, LDAP_BIND_PASSWORD, etc.
# y descomenta la siguiente linea:
# from ldapsync.ldap_config import *  # noqa: F401,F403

LDAP_ENABLED = config("LDAP_ENABLED", default=False, cast=bool)
if LDAP_ENABLED:
    try:
        from ldapsync.ldap_config import *  # noqa: F401,F403
        AUTHENTICATION_BACKENDS = AUTHENTICATION_BACKENDS_LDAP  # noqa: F405
    except ImportError:
        pass  # python-ldap no instalado; autenticacion LDAP deshabilitada
