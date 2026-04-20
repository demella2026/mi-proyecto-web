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
    'EN_USO': colors.HexColor('#C6EFCE'),
    'EN_BODEGA': colors.HexColor('#BDD7EE'),
    'EN_REPARACION': colors.HexColor('#FFEB9C'),
    'PENDIENTE_DEVOLUCION': colors.HexColor('#FCE4D6'),
    'DE_BAJA': colors.HexColor('#FFC7CE'),
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


def _resumen_paragraph(ss, total, en_uso, reparacion, de_baja):
    text = (
        f"<b>Total:</b> {total} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>En uso:</b> {en_uso} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>En reparacion:</b> {reparacion} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>De baja:</b> {de_baja}"
    )
    return Paragraph(text, ss['Normal'])


# ======================================================================
# Computadores
# ======================================================================
def generar_pdf_computadores(computadores):
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

    elements.append(Paragraph('Inventario de Computadores', ss['TituloReporte']))
    elements.append(Paragraph(
        f'Generado el {datetime.now():%d/%m/%Y %H:%M}',
        ss['Subtitulo'],
    ))

    eq_list = list(computadores)
    en_uso = sum(1 for e in eq_list if e.estado == 'EN_USO')
    reparacion = sum(1 for e in eq_list if e.estado == 'EN_REPARACION')
    de_baja = sum(1 for e in eq_list if e.estado == 'DE_BAJA')
    elements.append(_resumen_paragraph(ss, len(eq_list), en_uso, reparacion, de_baja))
    elements.append(Spacer(1, 12))

    headers = [
        '#', 'N Inv.', 'N Serie', 'Tipo', 'Marca', 'Modelo',
        'Procesador', 'RAM', 'Almac.', 'S.O.', 'Estado', 'Fecha',
    ]
    data = [headers]

    for idx, eq in enumerate(eq_list, 1):
        data.append([
            str(idx),
            eq.numero_inventario,
            eq.numero_serie,
            eq.get_tipo_equipo_display(),
            str(eq.marca),
            eq.modelo.nombre if eq.modelo else '',
            str(eq.procesador) if eq.procesador else '',
            str(eq.ram) if eq.ram else '',
            str(eq.almacenamiento) if eq.almacenamiento else '',
            str(eq.sistema_operativo) if eq.sistema_operativo else '',
            eq.get_estado_display(),
            eq.fecha_ingreso.strftime('%d/%m/%Y') if eq.fecha_ingreso else '',
        ])

    col_widths = [25, 60, 70, 55, 55, 70, 70, 50, 55, 70, 60, 55]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = _build_table_style()

    for i, eq in enumerate(eq_list, 1):
        color = STATUS_COLOR_MAP.get(eq.estado)
        if color:
            style.add('BACKGROUND', (10, i), (10, i), color)

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

    cel_list = list(celulares)
    en_uso = sum(1 for c in cel_list if c.estado == 'EN_USO')
    reparacion = sum(1 for c in cel_list if c.estado == 'EN_REPARACION')
    de_baja = sum(1 for c in cel_list if c.estado == 'DE_BAJA')
    elements.append(_resumen_paragraph(ss, len(cel_list), en_uso, reparacion, de_baja))
    elements.append(Spacer(1, 12))

    headers = [
        '#', 'N Linea', 'IMEI', 'N Serie', 'Tipo', 'Marca', 'Modelo',
        'RAM', 'Almac.', 'Estado', 'Fecha',
    ]
    data = [headers]

    for idx, cel in enumerate(cel_list, 1):
        data.append([
            str(idx),
            cel.numero_linea or '',
            cel.imei or '',
            cel.numero_serie or '',
            cel.get_tipo_equipo_display(),
            str(cel.marca),
            cel.modelo.nombre if cel.modelo else '',
            str(cel.ram) if cel.ram else '',
            str(cel.almacenamiento) if cel.almacenamiento else '',
            cel.get_estado_display(),
            cel.fecha_ingreso.strftime('%d/%m/%Y') if cel.fecha_ingreso else '',
        ])

    col_widths = [25, 70, 85, 70, 60, 55, 70, 50, 55, 65, 55]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = _build_table_style()

    for i, cel in enumerate(cel_list, 1):
        color = STATUS_COLOR_MAP.get(cel.estado)
        if color:
            style.add('BACKGROUND', (9, i), (9, i), color)

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

    headers = ['#', 'Fecha', 'Equipo', 'ID', 'Accion', 'Campo', 'Anterior', 'Nuevo', 'Usuario']
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
