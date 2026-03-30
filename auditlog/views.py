from django.db import models as db_models
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from .models import RegistroCambio
from .serializers import RegistroCambioSerializer


class RegistroCambioPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200


class RegistroCambioViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Historial de cambios (solo lectura).

    Parámetros de filtro disponibles:
        ?accion=CREACION | ACTUALIZACION | ELIMINACION | CAMBIO_ESTADO
        ?tipo=laptop | celular
        ?fecha_desde=2026-01-01
        ?fecha_hasta=2026-12-31
        ?usuario=admin
        ?buscar=texto libre
        ?object_id=5
    """

    serializer_class = RegistroCambioSerializer
    pagination_class = RegistroCambioPagination

    def get_queryset(self):
        qs = RegistroCambio.objects.select_related('content_type').all()
        params = self.request.query_params

        accion = params.get('accion')
        if accion:
            qs = qs.filter(accion=accion.upper())

        tipo = params.get('tipo')
        if tipo:
            qs = qs.filter(content_type__model=tipo.lower())

        object_id = params.get('object_id')
        if object_id:
            qs = qs.filter(object_id=object_id)

        fecha_desde = params.get('fecha_desde')
        if fecha_desde:
            qs = qs.filter(fecha__date__gte=fecha_desde)

        fecha_hasta = params.get('fecha_hasta')
        if fecha_hasta:
            qs = qs.filter(fecha__date__lte=fecha_hasta)

        usuario = params.get('usuario')
        if usuario:
            qs = qs.filter(usuario__icontains=usuario)

        buscar = params.get('buscar')
        if buscar:
            qs = qs.filter(
                db_models.Q(descripcion__icontains=buscar)
                | db_models.Q(campo__icontains=buscar)
                | db_models.Q(usuario__icontains=buscar)
            )

        return qs