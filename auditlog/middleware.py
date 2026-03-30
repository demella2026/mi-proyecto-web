import threading

_thread_locals = threading.local()


def get_current_user():
    """Devuelve el nombre de usuario del hilo actual."""
    return getattr(_thread_locals, 'user', None)


def get_current_ip():
    """Devuelve la dirección IP del hilo actual."""
    return getattr(_thread_locals, 'ip_address', None)


class AuditMiddleware:
    """
    Middleware que captura el usuario autenticado y la IP de cada request
    para que el mixin de auditoría pueda registrarlos automáticamente.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            _thread_locals.user = request.user.username
        else:
            _thread_locals.user = 'anónimo'

        _thread_locals.ip_address = self._get_client_ip(request)
        response = self.get_response(request)
        return response

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')