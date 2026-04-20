"""
Configuracion de django-auth-ldap para autenticacion con Active Directory.

Este archivo contiene las variables de configuracion que se deben
importar en settings.py para habilitar la autenticacion LDAP.

INSTRUCCIONES:
1. Configura las variables de entorno en tu .env:
   - LDAP_SERVER_URI=ldap://tu-servidor-ad.elecnor.local
   - LDAP_BASE_DN=DC=elecnor,DC=local
   - LDAP_DEPTOS_OU=OU=OU_DEPTOS          # OU raiz que contiene las sub-OUs de area
   - LDAP_BIND_DN=CN=svc_inventario,OU=ServiceAccounts,DC=elecnor,DC=local
   - LDAP_BIND_PASSWORD=tu_password_seguro
   - LDAP_GROUP_SEARCH_BASE=OU=Grupos,DC=elecnor,DC=local

2. En settings.py, agrega al final:
   from ldapsync.ldap_config import *
"""

import ldap
from django_auth_ldap.config import LDAPSearch, GroupOfNamesType
from decouple import config


# ========== SERVIDOR LDAP ==========
AUTH_LDAP_SERVER_URI = config(
    "LDAP_SERVER_URI",
    default="ldap://localhost:389",
)

# Credenciales de la cuenta de servicio para busquedas
AUTH_LDAP_BIND_DN = config(
    "LDAP_BIND_DN",
    default="",
)
AUTH_LDAP_BIND_PASSWORD = config(
    "LDAP_BIND_PASSWORD",
    default="",
)

# ========== BASE DN Y ESTRUCTURA OU ==========
# La autenticacion busca en toda la OU_DEPTOS (incluyendo sub-OUs)
# para que empleados de cualquier area puedan hacer login.
_base_dn       = config("LDAP_BASE_DN",   default="DC=elecnor,DC=local")
_deptos_ou     = config("LDAP_DEPTOS_OU", default="OU=OU_DEPTOS")
LDAP_DEPTOS_BASE = f"{_deptos_ou},{_base_dn}"

# ========== BUSQUEDA DE USUARIOS ==========
AUTH_LDAP_USER_SEARCH = LDAPSearch(
    LDAP_DEPTOS_BASE,
    ldap.SCOPE_SUBTREE,
    "(sAMAccountName=%(user)s)",
)

# ========== MAPEO DE ATRIBUTOS ==========
# Solo se sincronizan nombre y apellido. El cargo y el email
# son gestionados manualmente en la aplicacion.
AUTH_LDAP_USER_ATTR_MAP = {
    "first_name": "givenName",
    "last_name": "sn",
}

# ========== BUSQUEDA DE GRUPOS ==========
AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
    config("LDAP_GROUP_SEARCH_BASE", default=f"OU=Grupos,{_base_dn}"),
    ldap.SCOPE_SUBTREE,
    "(objectClass=group)",
)
AUTH_LDAP_GROUP_TYPE = GroupOfNamesType(name_attr="cn")

# ========== MAPEO DE PERMISOS POR GRUPO ==========
# Los usuarios que pertenezcan a estos grupos de AD tendran
# los permisos correspondientes en Django
AUTH_LDAP_USER_FLAGS_BY_GROUP = {
    "is_active": config(
        "LDAP_GROUP_ACTIVE",
        default="CN=UsuariosActivos,OU=Grupos,DC=dominio,DC=local",
    ),
    "is_staff": config(
        "LDAP_GROUP_STAFF",
        default="CN=AdminTI,OU=Grupos,DC=dominio,DC=local",
    ),
    "is_superuser": config(
        "LDAP_GROUP_SUPERUSER",
        default="CN=SuperAdmin,OU=Grupos,DC=dominio,DC=local",
    ),
}

# ========== OPCIONES AVANZADAS ==========
# Mantener usuario sincronizado en cada login
AUTH_LDAP_ALWAYS_UPDATE_USER = True

# Cache de grupos (en segundos) - 1 hora
AUTH_LDAP_CACHE_TIMEOUT = 3600

# Opciones de conexion
AUTH_LDAP_CONNECTION_OPTIONS = {
    ldap.OPT_REFERRALS: 0,
    ldap.OPT_NETWORK_TIMEOUT: 10,
}

# Usar TLS si esta disponible
AUTH_LDAP_START_TLS = config(
    "LDAP_START_TLS",
    default=False,
    cast=bool,
)

# ========== BACKEND DE AUTENTICACION ==========
# Esto se agrega a AUTHENTICATION_BACKENDS en settings.py
AUTHENTICATION_BACKENDS_LDAP = [
    "django_auth_ldap.backend.LDAPBackend",
    "django.contrib.auth.backends.ModelBackend",
]
