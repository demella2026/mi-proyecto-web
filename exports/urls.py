from django.urls import path

from .views import (
    ExportComputadoresExcelView,
    ExportComputadoresPDFView,
    ExportCelularesExcelView,
    ExportCelularesPDFView,
    ExportHistorialExcelView,
    ExportHistorialPDFView,
)

urlpatterns = [
    # Computadores
    path('computadores/excel/', ExportComputadoresExcelView.as_view(), name='export-computadores-excel'),
    path('computadores/pdf/', ExportComputadoresPDFView.as_view(), name='export-computadores-pdf'),

    # Celulares
    path('celulares/excel/', ExportCelularesExcelView.as_view(), name='export-celulares-excel'),
    path('celulares/pdf/', ExportCelularesPDFView.as_view(), name='export-celulares-pdf'),

    # Historial
    path('historial/excel/', ExportHistorialExcelView.as_view(), name='export-historial-excel'),
    path('historial/pdf/', ExportHistorialPDFView.as_view(), name='export-historial-pdf'),
]
