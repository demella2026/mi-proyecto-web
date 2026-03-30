from django.urls import path

from .views import (
    ExportLaptopsExcelView,
    ExportLaptopsPDFView,
    ExportCelularesExcelView,
    ExportCelularesPDFView,
    ExportHistorialExcelView,
    ExportHistorialPDFView,
)

urlpatterns = [
    # Laptops
    path('laptops/excel/', ExportLaptopsExcelView.as_view(), name='export-laptops-excel'),
    path('laptops/pdf/', ExportLaptopsPDFView.as_view(), name='export-laptops-pdf'),

    # Celulares
    path('celulares/excel/', ExportCelularesExcelView.as_view(), name='export-celulares-excel'),
    path('celulares/pdf/', ExportCelularesPDFView.as_view(), name='export-celulares-pdf'),

    # Historial
    path('historial/excel/', ExportHistorialExcelView.as_view(), name='export-historial-excel'),
    path('historial/pdf/', ExportHistorialPDFView.as_view(), name='export-historial-pdf'),
]