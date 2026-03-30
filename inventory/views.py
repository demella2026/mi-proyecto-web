"""
Vistas de la API (ViewSets) para el sistema de Inventario TI.
Incluye endpoints CRUD, generación de reportes (PDF/Excel), 
historial de auditoría y endpoints estadísticos para Dashboards.
"""

from io import BytesIO

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from django.db.models import Count
from django.http import HttpResponse

from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

# Modelos
from .models import (
    Marca, Modelo, Procesador, Ram, Almacenamiento,
    Area, Empleado, Laptop, Celular,
)
# Serializadores
from .serializers import (
    MarcaSerializer, ModeloSerializer, ProcesadorSerializer,
    RamSerializer, AlmacenamientoSerializer,
    AreaSerializer, EmpleadoSerializer,
    LaptopReadSerializer, LaptopWriteSerializer,
    CelularReadSerializer, CelularWriteSerializer,
)


# ═══════════════════════════════════════════════
#  CATÁLOGOS (Sin paginación para listas desplegables rápidas)
# ═══════════════════════════════════════════════

class MarcaViewSet(viewsets.ModelViewSet):
    """Manejo del catálogo de Marcas."""
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    search_fields = ["nombre"]
    pagination_class = None


class ModeloViewSet(viewsets.ModelViewSet):
    """Manejo de Modelos, filtrables por Marca."""
    queryset = Modelo.objects.select_related("marca").all()
    serializer_class = ModeloSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["marca"]
    search_fields = ["nombre", "marca__nombre"]
    pagination_class = None


class ProcesadorViewSet(viewsets.ModelViewSet):
    """Catálogo de Procesadores."""
    queryset = Procesador.objects.all()
    serializer_class = ProcesadorSerializer
    search_fields = ["nombre"]
    pagination_class = None


class RamViewSet(viewsets.ModelViewSet):
    """Catálogo de capacidades RAM."""
    queryset = Ram.objects.all()
    serializer_class = RamSerializer
    search_fields = ["capacidad"]
    pagination_class = None


class AlmacenamientoViewSet(viewsets.ModelViewSet):
    """Catálogo de capacidades de almacenamiento."""
    queryset = Almacenamiento.objects.all()
    serializer_class = AlmacenamientoSerializer
    search_fields = ["capacidad"]
    pagination_class = None


# ═══════════════════════════════════════════════
#  ORGANIZACIÓN
# ═══════════════════════════════════════════════

class AreaViewSet(viewsets.ModelViewSet):
    """Gestión de las áreas de la empresa."""
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    search_fields = ["nombre"]
    pagination_class = None


class EmpleadoViewSet(viewsets.ModelViewSet):
    """Gestión de empleados para asignarles equipos."""
    queryset = Empleado.objects.select_related("area").all()
    serializer_class = EmpleadoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["area", "activo"]
    search_fields = ["nombre", "email", "cargo"]
    pagination_class = None


# ═══════════════════════════════════════════════
#  HELPERS — Exportación de Reportes
# ═══════════════════════════════════════════════

HEADER_FILL = PatternFill(start_color="1F3A5F", end_color="1F3A5F", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11)

PDF_TABLE_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F3A5F")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("FONTSIZE", (0, 0), (-1, 0), 9),
    ("FONTSIZE", (0, 1), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
    ("TOPPADDING", (0, 0), (-1, 0), 10),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0F4F8")]),
])

def _excel_response(ws, wb, filename):
    """Aplica estilos a headers y devuelve HttpResponse para Excel."""
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center")
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = 20
    resp = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    wb.save(resp)
    return resp

def _pdf_response(title, headers, rows, filename):
    """Genera PDF con tabla y devuelve HttpResponse."""
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(letter), topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(title, styles["Title"]),
        Spacer(1, 12),
    ]
    data = [headers] + rows
    table = Table(data, repeatRows=1)
    table.setStyle(PDF_TABLE_STYLE)
    elements.append(table)
    doc.build(elements)
    buf.seek(0)
    resp = HttpResponse(buf, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp

def _asignado_nombre(obj):
    return obj.empleado_asignado.nombre if obj.empleado_asignado else "Sin asignar"

def _asignado_area(obj):
    return obj.empleado_asignado.area.nombre if obj.empleado_asignado else ""


# ═══════════════════════════════════════════════
#  HELPERS — Historial
# ═══════════════════════════════════════════════

def _serialize_history(queryset, tipo_equipo, limit=100):
    """Formatea los registros de django-simple-history en un JSON amigable."""
    results = []
    for record in queryset[:limit]:
        cambios = []
        if record.prev_record:
            try:
                delta = record.diff_against(record.prev_record)
                cambios = [
                    {"campo": c.field, "anterior": str(c.old), "nuevo": str(c.new)}
                    for c in delta.changes
                ]
            except Exception:
                pass
        results.append({
            "id": record.history_id,
            "tipo_equipo": tipo_equipo,
            "equipo": str(record),
            "equipo_id": record.id,
            "fecha": record.history_date,
            "tipo_cambio": record.get_history_type_display(),
            "usuario": record.history_user.username if record.history_user else "Sistema",
            "cambios": cambios,
        })
    return results


# ═══════════════════════════════════════════════
#  EQUIPOS (Laptops y Celulares)
# ═══════════════════════════════════════════════

class LaptopViewSet(viewsets.ModelViewSet):
    """Gestión de Laptops con exportación e historial."""
    queryset = Laptop.objects.select_related(
        "marca", "modelo", "modelo__marca", "procesador",
        "ram", "almacenamiento", "empleado_asignado", "empleado_asignado__area",
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["estado", "marca", "modelo", "procesador", "empleado_asignado"]
    search_fields = ["numero_serie", "marca__nombre", "modelo__nombre"]
    ordering_fields = ["fecha_ingreso", "estado", "marca__nombre"]

    def get_serializer_class(self):
        """Usa el serializador detallado para GET y el simple para POST/PUT."""
        if self.action in ("list", "retrieve"):
            return LaptopReadSerializer
        return LaptopWriteSerializer

    @action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        """Devuelve el historial de cambios de una Laptop específica."""
        laptop = self.get_object()
        data = _serialize_history(laptop.history.all(), "Laptop")
        return Response(data)

    @action(detail=False, methods=["get"], url_path="exportar-excel")
    def exportar_excel(self, request):
        qs = self.filter_queryset(self.get_queryset())
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Laptops"
        ws.append([
            "N° Serie", "Marca", "Modelo", "Procesador", "RAM",
            "Almacenamiento", "Estado", "Asignado a", "Área",
            "Fecha Ingreso", "Notas",
        ])
        for lp in qs:
            ws.append([
                lp.numero_serie, str(lp.marca), lp.modelo.nombre,
                str(lp.procesador), str(lp.ram), str(lp.almacenamiento),
                lp.get_estado_display(), _asignado_nombre(lp),
                _asignado_area(lp), str(lp.fecha_ingreso), lp.notas,
            ])
        return _excel_response(ws, wb, "laptops_inventario.xlsx")

    @action(detail=False, methods=["get"], url_path="exportar-pdf")
    def exportar_pdf(self, request):
        qs = self.filter_queryset(self.get_queryset())
        headers = ["N° Serie", "Marca", "Modelo", "Procesador", "RAM", "Disco", "Estado", "Asignado a"]
        rows = [
            [
                lp.numero_serie, str(lp.marca), lp.modelo.nombre,
                str(lp.procesador), str(lp.ram), str(lp.almacenamiento),
                lp.get_estado_display(), _asignado_nombre(lp),
            ]
            for lp in qs
        ]
        return _pdf_response("Reporte de Inventario — Laptops", headers, rows, "laptops_inventario.pdf")


class CelularViewSet(viewsets.ModelViewSet):
    """Gestión de Celulares con exportación e historial."""
    queryset = Celular.objects.select_related(
        "marca", "modelo", "modelo__marca",
        "ram", "almacenamiento", "empleado_asignado", "empleado_asignado__area",
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["estado", "marca", "modelo", "empleado_asignado"]
    search_fields = ["imei", "numero_serie", "marca__nombre", "modelo__nombre"]
    ordering_fields = ["fecha_ingreso", "estado", "marca__nombre"]

    def get_serializer_class(self):
        """Usa el serializador detallado para GET y el simple para POST/PUT."""
        if self.action in ("list", "retrieve"):
            return CelularReadSerializer
        return CelularWriteSerializer

    @action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        """Devuelve el historial de cambios de un Celular específico."""
        celular = self.get_object()
        data = _serialize_history(celular.history.all(), "Celular")
        return Response(data)

    @action(detail=False, methods=["get"], url_path="exportar-excel")
    def exportar_excel(self, request):
        qs = self.filter_queryset(self.get_queryset())
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Celulares"
        ws.append([
            "IMEI", "N° Serie", "Marca", "Modelo", "RAM",
            "Almacenamiento", "Estado", "Asignado a", "Área",
            "Fecha Ingreso", "Notas",
        ])
        for cl in qs:
            ws.append([
                cl.imei, cl.numero_serie, str(cl.marca), cl.modelo.nombre,
                str(cl.ram), str(cl.almacenamiento), cl.get_estado_display(),
                _asignado_nombre(cl), _asignado_area(cl),
                str(cl.fecha_ingreso), cl.notas,
            ])
        return _excel_response(ws, wb, "celulares_inventario.xlsx")

    @action(detail=False, methods=["get"], url_path="exportar-pdf")
    def exportar_pdf(self, request):
        qs = self.filter_queryset(self.get_queryset())
        headers = ["IMEI", "N° Serie", "Marca", "Modelo", "RAM", "Disco", "Estado", "Asignado a"]
        rows = [
            [
                cl.imei, cl.numero_serie, str(cl.marca), cl.modelo.nombre,
                str(cl.ram), str(cl.almacenamiento),
                cl.get_estado_display(), _asignado_nombre(cl),
            ]
            for cl in qs
        ]
        return _pdf_response("Reporte de Inventario — Celulares", headers, rows, "celulares_inventario.pdf")


# ═══════════════════════════════════════════════
#  VISTAS EXTRA (Dashboard + Historial Global)
# ═══════════════════════════════════════════════

@api_view(["GET"])
def dashboard_stats(request):
    """Endpoint para alimentar los gráficos del Panel Principal."""
    total_laptops = Laptop.objects.count()
    total_celulares = Celular.objects.count()

    lp_estado = dict(Laptop.objects.values_list("estado").annotate(c=Count("id")).values_list("estado", "c"))
    cl_estado = dict(Celular.objects.values_list("estado").annotate(c=Count("id")).values_list("estado", "c"))

    lp_marca = list(Laptop.objects.values("marca__nombre").annotate(count=Count("id")).order_by("-count")[:10])
    cl_marca = list(Celular.objects.values("marca__nombre").annotate(count=Count("id")).order_by("-count")[:10])

    sin_asignar = (
        Laptop.objects.filter(empleado_asignado__isnull=True).count()
        + Celular.objects.filter(empleado_asignado__isnull=True).count()
    )

    return Response({
        "total_laptops": total_laptops,
        "total_celulares": total_celulares,
        "total_equipos": total_laptops + total_celulares,
        "equipos_sin_asignar": sin_asignar,
        "total_empleados": Empleado.objects.filter(activo=True).count(),
        "total_areas": Area.objects.count(),
        "laptops_por_estado": {
            "activo": lp_estado.get("activo", 0),
            "en_reparacion": lp_estado.get("en_reparacion", 0),
            "de_baja": lp_estado.get("de_baja", 0),
        },
        "celulares_por_estado": {
            "activo": cl_estado.get("activo", 0),
            "en_reparacion": cl_estado.get("en_reparacion", 0),
            "de_baja": cl_estado.get("de_baja", 0),
        },
        "laptops_por_marca": lp_marca,
        "celulares_por_marca": cl_marca,
    })


@api_view(["GET"])
def historial_global(request):
    """Endpoint para ver todos los movimientos del sistema en una sola lista."""
    tipo = request.query_params.get("tipo", None)
    results = []

    if tipo is None or tipo == "laptop":
        results += _serialize_history(
            Laptop.history.all().select_related("history_user"), "Laptop", 150
        )
    if tipo is None or tipo == "celular":
        results += _serialize_history(
            Celular.history.all().select_related("history_user"), "Celular", 150
        )

    # Ordenar desde el cambio más reciente al más antiguo
    results.sort(key=lambda x: x["fecha"], reverse=True)
    return Response(results[:200])