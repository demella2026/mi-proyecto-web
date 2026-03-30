from datetime import datetime

from django.http import HttpResponse
from rest_framework.views import APIView

from inventory.models import Laptop, Celular
from auditlog.models import RegistroCambio

from .utils_excel import (
    generar_excel_laptops,
    generar_excel_celulares,
    generar_excel_historial,
)
from .utils_pdf import (
    generar_pdf_laptops,
    generar_pdf_celulares,
    generar_pdf_historial,
)


EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
PDF_CONTENT_TYPE = 'application/pdf'


def _filtrar_equipos(request, queryset):
    """Aplica filtros comunes a laptops y celulares."""
    estado = request.query_params.get('estado')
    if estado:
        queryset = queryset.filter(estado=estado.upper())

    marca = request.query_params.get('marca')
    if marca:
        queryset = queryset.filter(modelo__marca__nombre__icontains=marca)

    fecha_desde = request.query_params.get('fecha_desde')
    if fecha_desde:
        queryset = queryset.filter(fecha_ingreso__gte=fecha_desde)

    fecha_hasta = request.query_params.get('fecha_hasta')
    if fecha_hasta:
        queryset = queryset.filter(fecha_ingreso__lte=fecha_hasta)

    return queryset


def _filtrar_historial(request, queryset):
    """Aplica filtros al historial de cambios."""
    accion = request.query_params.get('accion')
    if accion:
        queryset = queryset.filter(accion=accion.upper())

    tipo = request.query_params.get('tipo')
    if tipo:
        queryset = queryset.filter(content_type__model=tipo.lower())

    fecha_desde = request.query_params.get('fecha_desde')
    if fecha_desde:
        queryset = queryset.filter(fecha__date__gte=fecha_desde)

    fecha_hasta = request.query_params.get('fecha_hasta')
    if fecha_hasta:
        queryset = queryset.filter(fecha__date__lte=fecha_hasta)

    usuario = request.query_params.get('usuario')
    if usuario:
        queryset = queryset.filter(usuario__icontains=usuario)

    return queryset


def _timestamp():
    return datetime.now().strftime('%Y%m%d_%H%M%S')


# ======================================================================
# LAPTOPS
# ======================================================================
class ExportLaptopsExcelView(APIView):
    def get(self, request):
        qs = Laptop.objects.select_related(
            'modelo', 'modelo__marca', 'procesador', 'ram', 'almacenamiento',
        ).all()
        qs = _filtrar_equipos(request, qs)
        buf = generar_excel_laptops(qs)
        response = HttpResponse(buf.getvalue(), content_type=EXCEL_CONTENT_TYPE)
        response['Content-Disposition'] = f'attachment; filename="laptops_{_timestamp()}.xlsx"'
        return response


class ExportLaptopsPDFView(APIView):
    def get(self, request):
        qs = Laptop.objects.select_related(
            'modelo', 'modelo__marca', 'procesador', 'ram', 'almacenamiento',
        ).all()
        qs = _filtrar_equipos(request, qs)
        buf = generar_pdf_laptops(qs)
        response = HttpResponse(buf.getvalue(), content_type=PDF_CONTENT_TYPE)
        response['Content-Disposition'] = f'attachment; filename="laptops_{_timestamp()}.pdf"'
        return response


# ======================================================================
# CELULARES
# ======================================================================
class ExportCelularesExcelView(APIView):
    def get(self, request):
        qs = Celular.objects.select_related(
            'modelo', 'modelo__marca', 'ram', 'almacenamiento',
        ).all()
        qs = _filtrar_equipos(request, qs)
        buf = generar_excel_celulares(qs)
        response = HttpResponse(buf.getvalue(), content_type=EXCEL_CONTENT_TYPE)
        response['Content-Disposition'] = f'attachment; filename="celulares_{_timestamp()}.xlsx"'
        return response


class ExportCelularesPDFView(APIView):
    def get(self, request):
        qs = Celular.objects.select_related(
            'modelo', 'modelo__marca', 'ram', 'almacenamiento',
        ).all()
        qs = _filtrar_equipos(request, qs)
        buf = generar_pdf_celulares(qs)
        response = HttpResponse(buf.getvalue(), content_type=PDF_CONTENT_TYPE)
        response['Content-Disposition'] = f'attachment; filename="celulares_{_timestamp()}.pdf"'
        return response


# ======================================================================
# HISTORIAL
# ======================================================================
class ExportHistorialExcelView(APIView):
    def get(self, request):
        qs = RegistroCambio.objects.select_related('content_type').all()
        qs = _filtrar_historial(request, qs)
        buf = generar_excel_historial(qs)
        response = HttpResponse(buf.getvalue(), content_type=EXCEL_CONTENT_TYPE)
        response['Content-Disposition'] = f'attachment; filename="historial_{_timestamp()}.xlsx"'
        return response


class ExportHistorialPDFView(APIView):
    def get(self, request):
        qs = RegistroCambio.objects.select_related('content_type').all()
        qs = _filtrar_historial(request, qs)
        buf = generar_pdf_historial(qs)
        response = HttpResponse(buf.getvalue(), content_type=PDF_CONTENT_TYPE)
        response['Content-Disposition'] = f'attachment; filename="historial_{_timestamp()}.pdf"'
        return response