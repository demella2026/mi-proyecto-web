"""
Vistas de autenticación personalizadas.
Extiende simplejwt para incluir rol (is_admin) en el token JWT.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class InventarioTokenSerializer(TokenObtainPairSerializer):
    """Agrega claims extra al JWT: is_admin, rol, centro_costo_id, username, nombre."""

    @classmethod
    def get_token(cls, user):
        """
        Extiende el JWT estándar de simplejwt con claims personalizados del sistema.
        Claims agregados al payload del token:
        - is_admin: True si el usuario tiene is_staff o is_superuser
        - username: sAMAccountName o username del usuario
        - nombre: nombre completo (first_name + last_name) o username como fallback
        - rol: valor de PerfilUsuario.rol (ADMIN, ENCARGADO_OBRA, VIEWER)
        - centro_costo_id: FK del CC asignado al perfil (None si no aplica)
        Estos claims son leídos en el frontend por parseJwt() en auth.jsx.
        """
        token = super().get_token(user)
        token["is_admin"] = user.is_staff or user.is_superuser
        token["username"] = user.username
        token["nombre"]   = (
            f"{user.first_name} {user.last_name}".strip() or user.username
        )
        # Perfil de rol
        try:
            perfil = user.perfil
            token["rol"]           = perfil.rol
            token["centro_costo_id"] = perfil.centro_costo_id
        except Exception:
            token["rol"]           = "VIEWER"
            token["centro_costo_id"] = None
        return token


class InventarioTokenView(TokenObtainPairView):
    serializer_class = InventarioTokenSerializer
