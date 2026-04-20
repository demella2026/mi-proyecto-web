"""
Vistas de la API para la Bitacora Tecnica de Mantenimiento.
"""

from rest_framework import viewsets, filters, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Mantenimiento, ArchivoMantenimiento
from .serializers import (
    MantenimientoReadSerializer,
    MantenimientoWriteSerializer,
    ArchivoMantenimientoSerializer,
)


class MantenimientoViewSet(viewsets.ModelViewSet):
    """
    CRUD de registros de mantenimiento.
    GET usa el serializador expandido; POST/PUT usa el de escritura.
    """
    queryset = Mantenimiento.objects.select_related(
        "content_type", "tecnico_responsable",
        "nueva_ram", "nuevo_almacenamiento", "nuevo_procesador",
    ).prefetch_related("archivos").all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["tipo", "estado", "content_type"]
    search_fields = ["descripcion", "diagnostico", "componentes_cambiados", "notas"]
    ordering_fields = ["fecha_creacion", "fecha_inicio", "fecha_fin", "costo_repuestos"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return MantenimientoReadSerializer
        return MantenimientoWriteSerializer

    @action(
        detail=True,
        methods=["post"],
        url_path="subir-archivo",
        parser_classes=[parsers.MultiPartParser, parsers.FormParser],
    )
    def subir_archivo(self, request, pk=None):
        """Sube un archivo adjunto a un registro de mantenimiento."""
        mantenimiento = self.get_object()
        serializer = ArchivoMantenimientoSerializer(data={
            "mantenimiento": mantenimiento.pk,
            "archivo": request.FILES.get("archivo"),
            "tipo": request.data.get("tipo", "otro"),
            "descripcion": request.data.get("descripcion", ""),
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="por-equipo/(?P<tipo>computador|celular|monitor)/(?P<equipo_id>[0-9]+)")
    def por_equipo(self, request, tipo=None, equipo_id=None):
        """Lista los mantenimientos de un equipo especifico."""
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get(app_label="inventory", model=tipo)
        qs = self.get_queryset().filter(content_type=ct, object_id=equipo_id)
        serializer = MantenimientoReadSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="resumen-costos")
    def resumen_costos(self, request):
        """Resumen de costos de mantenimiento."""
        from django.db.models import Sum, Count, Avg
        qs = self.filter_queryset(self.get_queryset())
        stats = qs.aggregate(
            total_registros=Count("id"),
            total_repuestos=Sum("costo_repuestos"),
            total_mano_obra=Sum("costo_mano_obra"),
            promedio_repuestos=Avg("costo_repuestos"),
        )
        # Costos por tipo
        por_tipo = list(
            qs.values("tipo").annotate(
                cantidad=Count("id"),
                total_costo=Sum("costo_repuestos") + Sum("costo_mano_obra"),
            )
        )
        stats["por_tipo"] = por_tipo
        stats["costo_total"] = (
            (stats["total_repuestos"] or 0) + (stats["total_mano_obra"] or 0)
        )
        return Response(stats)


class ArchivoMantenimientoViewSet(viewsets.ModelViewSet):
    """CRUD de archivos adjuntos de mantenimiento."""
    queryset = ArchivoMantenimiento.objects.all()
    serializer_class = ArchivoMantenimientoSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mantenimiento", "tipo"]
    pagination_class = None
