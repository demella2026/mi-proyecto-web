from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)


# ======================================================================
# Estilos base
# ======================================================================
def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(
        name='TituloReporte',
        parent=ss['Title'],
        fontSize=18,
        textColor=colors.HexColor('#1F4E79'),
        spaceAfter=6,
    ))
    ss.add(ParagraphStyle(
        name='Subtitulo',
        parent=ss['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=14,
    ))
    ss.add(ParagraphStyle(
        name='CeldaTexto',
        parent=ss['Normal'],
        fontSize=8,
        leading=10,
    ))
    return ss


STATUS_COLOR_MAP = {
    'ACTIVO': colors.HexColor('#C6EFCE'),
    'EN_REPARACION': colors.HexColor('#FFEB9C'),
    'BAJA': colors.HexColor('#FFC7CE'),
}

ACCION_COLOR_MAP = {
    'CREACION': colors.HexColor('#C6EFCE'),
    'ACTUALIZACION': colors.HexColor('#BDD7EE'),
    'CAMBIO_ESTADO': colors.HexColor('#FFEB9C'),
    'ELIMINACION': colors.HexColor('#FFC7CE'),
}


def _build_table_style(header_rows=1):
    """Devuelve un estilo base para tablas con encabezado azul oscuro."""
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, header_rows - 1), colors.HexColor('#1F4E79')),
        ('TEXTCOLOR', (0, 0), (-1, header_rows - 1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows - 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, header_rows - 1), 9),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [colors.white, colors.HexColor('#F2F2F2')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ])


def _resumen_paragraph(ss, total, activos, reparacion, baja):
    text = (
        f"<b>Total:</b> {total} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Activos:</b> {activos} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>En reparación:</b> {reparacion} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>De baja:</b> {baja}"
    )
    return Paragraph(text, ss['Normal'])


# ======================================================================
# Laptops
# ======================================================================
def generar_pdf_laptops(laptops):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(letter),
        leftMargin=1 * cm,
        rightMargin=1 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    ss = _styles()
    elements = []

    elements.append(Paragraph('Inventario de Laptops', ss['TituloReporte']))
    elements.append(Paragraph(
        f'Generado el {datetime.now():%d/%m/%Y %H:%M}',
        ss['Subtitulo'],
    ))

    laptops_list = list(laptops)
    activos = sum(1 for l in laptops_list if l.estado == 'ACTIVO')
    reparacion = sum(1 for l in laptops_list if l.estado == 'EN_REPARACION')
    baja = sum(1 for l in laptops_list if l.estado == 'BAJA')
    elements.append(_resumen_paragraph(ss, len(laptops_list), activos, reparacion, baja))
    elements.append(Spacer(1, 12))

    headers = ['#', 'N° Serie', 'Marca', 'Modelo', 'Procesador', 'RAM', 'Almac.', 'Estado', 'Fecha']
    data = [headers]

    for idx, laptop in enumerate(laptops_list, 1):
        data.append([
            str(idx),
            laptop.numero_serie,
            str(laptop.modelo.marca) if laptop.modelo and hasattr(laptop.modelo, 'marca') else '',
            str(laptop.modelo) if laptop.modelo else '',
            str(laptop.procesador) if hasattr(laptop, 'procesador') and laptop.procesador else '',
            str(laptop.ram) if laptop.ram else '',
            str(laptop.almacenamiento) if laptop.almacenamiento else '',
            laptop.get_estado_display() if hasattr(laptop, 'get_estado_display') else laptop.estado,
            laptop.fecha_ingreso.strftime('%d/%m/%Y') if hasattr(laptop, 'fecha_ingreso') and laptop.fecha_ingreso else '',
        ])

    col_widths = [30, 90, 70, 90, 90, 60, 70, 80, 70]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = _build_table_style()

    for i, laptop in enumerate(laptops_list, 1):
        color = STATUS_COLOR_MAP.get(laptop.estado)
        if color:
            style.add('BACKGROUND', (7, i), (7, i), color)

    table.setStyle(style)
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf


# ======================================================================
# Celulares
# ======================================================================
def generar_pdf_celulares(celulares):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(letter),
        leftMargin=1 * cm,
        rightMargin=1 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    ss = _styles()
    elements = []

    elements.append(Paragraph('Inventario de Celulares', ss['TituloReporte']))
    elements.append(Paragraph(
        f'Generado el {datetime.now():%d/%m/%Y %H:%M}',
        ss['Subtitulo'],
    ))

    celulares_list = list(celulares)
    activos = sum(1 for c in celulares_list if c.estado == 'ACTIVO')
    reparacion = sum(1 for c in celulares_list if c.estado == 'EN_REPARACION')
    baja = sum(1 for c in celulares_list if c.estado == 'BAJA')
    elements.append(_resumen_paragraph(ss, len(celulares_list), activos, reparacion, baja))
    elements.append(Spacer(1, 12))

    headers = ['#', 'N° Serie', 'IMEI', 'Marca', 'Modelo', 'RAM', 'Almac.', 'Estado', 'Fecha']
    data = [headers]

    for idx, cel in enumerate(celulares_list, 1):
        data.append([
            str(idx),
            cel.numero_serie,
            cel.imei if hasattr(cel, 'imei') else '',
            str(cel.modelo.marca) if cel.modelo and hasattr(cel.modelo, 'marca') else '',
            str(cel.modelo) if cel.modelo else '',
            str(cel.ram) if cel.ram else '',
            str(cel.almacenamiento) if cel.almacenamiento else '',
            cel.get_estado_display() if hasattr(cel, 'get_estado_display') else cel.estado,
            cel.fecha_ingreso.strftime('%d/%m/%Y') if hasattr(cel, 'fecha_ingreso') and cel.fecha_ingreso else '',
        ])

    col_widths = [30, 90, 100, 70, 80, 60, 70, 80, 70]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = _build_table_style()

    for i, cel in enumerate(celulares_list, 1):
        color = STATUS_COLOR_MAP.get(cel.estado)
        if color:
            style.add('BACKGROUND', (7, i), (7, i), color)

    table.setStyle(style)
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf


# ======================================================================
# Historial de cambios
# ======================================================================
def generar_pdf_historial(registros):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(letter),
        leftMargin=1 * cm,
        rightMargin=1 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    ss = _styles()
    elements = []

    elements.append(Paragraph('Historial de Cambios', ss['TituloReporte']))
    elements.append(Paragraph(
        f'Generado el {datetime.now():%d/%m/%Y %H:%M}',
        ss['Subtitulo'],
    ))
    elements.append(Spacer(1, 12))

    headers = ['#', 'Fecha', 'Equipo', 'ID', 'Acción', 'Campo', 'Anterior', 'Nuevo', 'Usuario']
    data = [headers]

    registros_list = list(registros)
    for idx, reg in enumerate(registros_list, 1):
        data.append([
            str(idx),
            reg.fecha.strftime('%d/%m/%Y %H:%M') if reg.fecha else '',
            reg.content_type.model.capitalize() if reg.content_type else '',
            str(reg.object_id),
            reg.get_accion_display(),
            reg.campo or '',
            Paragraph(reg.valor_anterior or '', ss['CeldaTexto']),
            Paragraph(reg.valor_nuevo or '', ss['CeldaTexto']),
            reg.usuario or '',
        ])

    col_widths = [25, 80, 60, 30, 75, 70, 110, 110, 65]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = _build_table_style()

    for i, reg in enumerate(registros_list, 1):
        color = ACCION_COLOR_MAP.get(reg.accion)
        if color:
            style.add('BACKGROUND', (4, i), (4, i), color)

    table.setStyle(style)
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf