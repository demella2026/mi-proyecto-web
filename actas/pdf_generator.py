"""
Generador de PDFs para Actas de Entrega — formato Elecnor Chile.
Produce actas idénticas al formato oficial para:
  • Equipos informáticos (Computador / Laptop / Desktop / AIO / Workstation)
  • Equipos telefónicos (Celular / Smartphone / Tablet)
"""

import io
import os
import base64
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable, KeepTogether,
)
from reportlab.graphics.shapes import Drawing, Line

# ── Colores corporativos ──────────────────────────────────────────────────────
AZUL_CORP    = colors.HexColor("#003DA5")   # Azul Elecnor
AZUL_CLARO   = colors.HexColor("#E8EEF8")
GRIS_LINEA   = colors.HexColor("#CCCCCC")
GRIS_TEXTO   = colors.HexColor("#555555")
NEGRO        = colors.HexColor("#1A1A1A")
BLANCO       = colors.white

# ── Ruta del logo (opcional) ──────────────────────────────────────────────────
LOGO_PATH = os.path.join(settings.BASE_DIR, "static", "elecnor_logo.png")

# ── Datos de la empresa ───────────────────────────────────────────────────────
EMPRESA_NOMBRE    = "ELECNOR CHILE"
EMPRESA_DIRECCION = "Av Apoquindo 4501"
EMPRESA_CIUDAD    = "Las Condes - Stgo"
EMPRESA_WEB       = "www.elecnor.cl"

MESES_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}


# ═════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA PRINCIPAL
# ═════════════════════════════════════════════════════════════════════════════

def generar_pdf_acta(acta):
    """
    Genera el PDF del acta y lo guarda en acta.archivo_pdf.
    Detecta automáticamente si es equipo informático o telefónico.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=2.0 * cm,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
    )

    detalle = acta.detalle_equipo or {}
    es_telefono = _es_equipo_telefonico(acta, detalle)

    styles  = _estilos()
    fecha   = acta.fecha_creacion or timezone.now()
    emp     = acta.empleado
    responsable = acta.responsable_ti

    elements = []

    # 1 — Encabezado
    elements += _encabezado(styles, fecha, es_telefono)
    elements.append(Spacer(1, 4 * mm))

    # 2 — Texto introductorio
    elements += _texto_intro(styles, fecha, es_telefono)
    elements.append(Spacer(1, 4 * mm))

    # 3 — Sección 1: Funcionario responsable
    elements += _seccion_funcionario(styles, emp)
    elements.append(Spacer(1, 4 * mm))

    # 4 — Sección 2: Equipo asignado
    if es_telefono:
        elements += _seccion_equipo_telefonico(styles, detalle, acta)
    else:
        elements += _seccion_equipo_informatico(styles, detalle, acta)
    elements.append(Spacer(1, 4 * mm))

    # 5 — Sección 3: Prueba de funcionalidad
    if es_telefono:
        elements += _prueba_funcionalidad_telefono(styles)
    else:
        elements += _prueba_funcionalidad_computador(styles)
    elements.append(Spacer(1, 6 * mm))

    # 6 — Firmas
    elements += _seccion_firmas(styles, acta, emp, responsable)

    # 7 — Pie de página con hash si existe
    if acta.firma_digital_hash:
        elements += _firma_digital_pie(styles, acta)

    doc.build(elements)
    buffer.seek(0)

    filename = f"{acta.numero_acta}.pdf"
    acta.archivo_pdf.save(filename, ContentFile(buffer.read()), save=True)
    return acta


def generar_pdf_acta_response(acta):
    """Genera o reutiliza el PDF y lo devuelve como HttpResponse."""
    from django.http import HttpResponse

    if not acta.archivo_pdf:
        generar_pdf_acta(acta)
        acta.refresh_from_db()

    response = HttpResponse(acta.archivo_pdf.read(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{acta.numero_acta}.pdf"'
    return response


# ═════════════════════════════════════════════════════════════════════════════
# BLOQUES DE CONTENIDO
# ═════════════════════════════════════════════════════════════════════════════

def _encabezado(styles, fecha, es_telefono):
    """
    Tabla de 3 columnas: Logo | Título | Fecha + Dirección
    Réplica exacta del encabezado de las actas oficiales.
    """
    fecha_str = fecha.strftime("%-d de %B de %Y") if hasattr(fecha, 'strftime') else str(fecha)
    # Mes en español
    for n, mes in MESES_ES.items():
        fecha_str = fecha_str.replace(datetime(2000, n, 1).strftime("%B"), mes.capitalize())

    titulo = "ACTA DE ENTREGA DE EQUIPOS TELEFÓNICOS" if es_telefono else "ACTA DE ENTREGA DE EQUIPOS INFORMÁTICOS"

    # Columna izquierda: logo o texto empresa
    col_logo = _celda_logo(styles)

    # Columna central: título
    col_titulo = [
        Spacer(1, 2 * mm),
        Paragraph(EMPRESA_NOMBRE, styles["empresa_nombre"]),
        Spacer(1, 2 * mm),
        Paragraph(titulo, styles["titulo"]),
    ]

    # Columna derecha: fecha y dirección
    col_derecha = [
        Paragraph(fecha_str, styles["header_derecha"]),
        Paragraph(EMPRESA_DIRECCION, styles["header_derecha"]),
        Paragraph(EMPRESA_CIUDAD, styles["header_derecha"]),
        Paragraph(EMPRESA_WEB, styles["header_derecha_web"]),
    ]

    t = Table(
        [[col_logo, col_titulo, col_derecha]],
        colWidths=[3.5 * cm, 10.5 * cm, 4.5 * cm],
    )
    t.setStyle(TableStyle([
        ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",   (0, 0), (0, 0),   "LEFT"),
        ("ALIGN",   (1, 0), (1, 0),   "CENTER"),
        ("ALIGN",   (2, 0), (2, 0),   "RIGHT"),
        ("BOX",     (0, 0), (-1, -1), 1.0, AZUL_CORP),
        ("LINEAFTER", (0, 0), (0, 0), 0.5, GRIS_LINEA),
        ("LINEAFTER", (1, 0), (1, 0), 0.5, GRIS_LINEA),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    return [t]


def _celda_logo(styles):
    """Devuelve imagen del logo si existe, sino texto de empresa."""
    if os.path.exists(LOGO_PATH):
        try:
            return Image(LOGO_PATH, width=2.8 * cm, height=1.8 * cm)
        except Exception:
            pass
    return Paragraph(EMPRESA_NOMBRE, styles["empresa_logo_texto"])


def _texto_intro(styles, fecha, es_telefono):
    dia  = fecha.day
    mes  = MESES_ES.get(fecha.month, str(fecha.month)).upper()
    anio = fecha.year

    tipo_str = "ACCESORIOS computacionales. - EQUIPOS TELEFÓNICOS ASIGNADOS" if es_telefono \
               else "ACCESORIOS computacionales.- EQUIPOS COMPUTACIONALES ASIGNADOS"

    texto = (
        f"Hoy <b>{dia}</b> del mes <b>{mes}</b> de <b>{anio}</b> en oficina central de "
        f"<b>Elecnor Chile S.A</b>, mediante el presente documento se realiza la entrega "
        f"formal de los {tipo_str} para el cumplimiento de las actividades laborales del "
        f"<b>FUNCIONARIO RESPONSABLE</b>, quién declara recepción de los mismos en buen "
        f"estado y se compromete a cuidar de los recursos y hacer uso de ellos para los "
        f"fines establecidos."
    )
    return [Paragraph(texto, styles["cuerpo"])]


def _seccion_funcionario(styles, emp):
    """Sección 1: Datos del funcionario responsable."""
    elems = [Paragraph("1.- FUNCIONARIO RESPONSABLE", styles["seccion"])]

    rut_val = emp.numero_documento or ""
    rows = [
        [Paragraph("<b>Nombres, Apellidos</b>", styles["tabla_label"]),
         Paragraph(emp.get_full_name().upper(), styles["tabla_valor"])],
        [Paragraph("<b>RUT (PASAPORTE)</b>", styles["tabla_label"]),
         Paragraph(rut_val, styles["tabla_valor"])],
        [Paragraph("<b>Cargo</b>", styles["tabla_label"]),
         Paragraph(emp.cargo or "", styles["tabla_valor"])],
    ]
    t = Table(rows, colWidths=[5 * cm, 13 * cm])
    t.setStyle(_estilo_tabla_datos())
    elems.append(t)
    return elems


def _seccion_equipo_informatico(styles, detalle, acta):
    """Sección 2 para computadores: modelo, serie, inventario + tabla de specs."""
    elems = [Paragraph("2.- EQUIPOS COMPUTACIONALES ASIGNADOS", styles["seccion"])]

    # Cabecera del equipo
    modelo_val    = detalle.get("modelo", "")
    serie_val     = detalle.get("numero_serie", "")
    inventario_val = detalle.get("numero_inventario", "")

    cabecera_rows = [
        [Paragraph("<b>MODELO DEL EQUIPO</b>",    styles["tabla_label"]),
         Paragraph(str(modelo_val).upper(),       styles["tabla_valor"])],
        [Paragraph("<b>NUMERO DE SERIE</b>",       styles["tabla_label"]),
         Paragraph(str(serie_val).upper(),        styles["tabla_valor"])],
        [Paragraph("<b>NUMERO DE INVENTARIO</b>",  styles["tabla_label"]),
         Paragraph(str(inventario_val).upper(),   styles["tabla_valor"])],
    ]
    t_cab = Table(cabecera_rows, colWidths=[5 * cm, 13 * cm])
    t_cab.setStyle(_estilo_tabla_datos())
    elems.append(t_cab)
    elems.append(Spacer(1, 3 * mm))

    # Tabla de especificaciones
    ram_val    = detalle.get("ram", "")
    disco_val  = detalle.get("almacenamiento", "")
    proc_val   = detalle.get("procesador", "")
    so_val     = detalle.get("sistema_operativo", "")
    marca_val  = detalle.get("marca", "")

    # Dividir procesador en marca y nombre si hay espacio
    proc_marca = "INTEL" if "Intel" in proc_val or "INTEL" in proc_val else \
                 "AMD"   if "AMD"   in proc_val else ""

    so_ref = so_val
    so_marca = "Microsoft" if "Windows" in so_val else \
               "Apple"     if "macOS"   in so_val else ""

    # Accesorios desde el acta
    accesorios_raw = acta.accesorios or ""
    acc_celular    = "✓" if "celular" in accesorios_raw.lower() or "teléfono" in accesorios_raw.lower() else ""
    acc_maleta     = "✓" if "maletín" in accesorios_raw.lower() or "mochila" in accesorios_raw.lower() or "bolso" in accesorios_raw.lower() else ""
    acc_mouse      = "✓" if "mouse" in accesorios_raw.lower() or "teclado" in accesorios_raw.lower() else ""
    acc_adaptador  = "✓" if "adaptador" in accesorios_raw.lower() else ""
    acc_candado    = "✓" if "candado" in accesorios_raw.lower() else ""
    acc_disco_ext  = "✓" if "disco externo" in accesorios_raw.lower() else ""

    header_specs = [
        Paragraph("<b>Descripción</b>", styles["tabla_header"]),
        Paragraph("<b>Marca</b>",       styles["tabla_header"]),
        Paragraph("<b>Referencia</b>",  styles["tabla_header"]),
        Paragraph("<b>Características</b>", styles["tabla_header"]),
        Paragraph("<b>Estado</b>",      styles["tabla_header"]),
    ]

    def fila(desc, marca="", ref="", caract="", estado=""):
        return [
            Paragraph(desc,   styles["tabla_celda"]),
            Paragraph(marca,  styles["tabla_celda"]),
            Paragraph(ref,    styles["tabla_celda"]),
            Paragraph(caract, styles["tabla_celda"]),
            Paragraph(estado, styles["tabla_celda"]),
        ]

    # Extraer frecuencia del procesador si está disponible
    proc_caract = proc_val
    proc_ref    = proc_val

    filas_specs = [
        header_specs,
        fila("Procesador",    proc_marca, proc_ref,  proc_caract),
        fila("Disco Duro",    "",         disco_val,  "SSD" if "SSD" in disco_val.upper() or "NVME" in disco_val.upper() else "HDD"),
        fila("Memoria RAM",   "",         "",         ram_val),
        fila("Teclado",       "",         "",         ""),
        fila("Monitor",       "",         "",         ""),
        fila("Unidad Óptica", "",         "No Incluido", ""),
        fila("S.O.",          so_marca,   so_ref,     so_ref),
        fila("Conector de Red","",        "",         ""),
        fila("Cargador",      marca_val,  "",         ""),
        fila("", "", "", "", ""),  # fila vacía accesorios label
        fila("Accesorios:", "", "", "", ""),
        fila("Celular",        "",        "",         acc_celular),
        fila("Maletín (MOCHILA)", "",     "",         acc_maleta),
        fila("Mouse / Teclado", "",       "",         acc_mouse),
        fila("Adaptador",      "",        "",         acc_adaptador),
        fila("Candado",        "",        "",         acc_candado),
        fila("Disco Externo",  "",        "",         acc_disco_ext),
    ]

    t_specs = Table(filas_specs, colWidths=[4.0*cm, 2.5*cm, 3.5*cm, 5.5*cm, 2.5*cm])
    t_specs.setStyle(TableStyle([
        # Header
        ("BACKGROUND",    (0, 0), (-1, 0),  AZUL_CORP),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  BLANCO),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        # Fila "Accesorios:"
        ("FONTNAME",      (0, 11), (0, 11), "Helvetica-Bold"),
        ("SPAN",          (0, 10), (-1, 10)),
        ("BACKGROUND",    (0, 10), (-1, 10), AZUL_CLARO),
        ("SPAN",          (0, 11), (-1, 11)),
        ("BACKGROUND",    (0, 11), (-1, 11), AZUL_CLARO),
        # Zebra
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8FF")]),
        # Grid
        ("GRID",          (0, 0), (-1, -1), 0.4, GRIS_LINEA),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
    ]))
    elems.append(t_specs)
    return elems


def _seccion_equipo_telefonico(styles, detalle, acta):
    """Sección 2 para teléfonos: modelo, serie, número de línea + chip."""
    elems = [Paragraph("2.- EQUIPOS TELEFÓNICOS ASIGNADOS", styles["seccion"])]

    modelo_val  = detalle.get("modelo", "")
    serie_val   = detalle.get("numero_serie", "")
    imei_val    = detalle.get("imei", "")
    linea_val   = detalle.get("numero_linea", "")
    marca_val   = detalle.get("marca", "")

    cabecera_rows = [
        [Paragraph("<b>MODELO DEL EQUIPO</b>",  styles["tabla_label"]),
         Paragraph(str(modelo_val).upper(),     styles["tabla_valor"])],
        [Paragraph("<b>NÚMERO DE SERIE</b>",    styles["tabla_label"]),
         Paragraph(str(serie_val).upper(),      styles["tabla_valor"])],
        [Paragraph("<b>IMEI</b>",               styles["tabla_label"]),
         Paragraph(str(imei_val),               styles["tabla_valor"])],
        [Paragraph("<b>NÚMERO DE CELULAR</b>",  styles["tabla_label"]),
         Paragraph(str(linea_val),              styles["tabla_valor"])],
    ]
    t_cab = Table(cabecera_rows, colWidths=[5 * cm, 13 * cm])
    t_cab.setStyle(_estilo_tabla_datos())
    elems.append(t_cab)
    elems.append(Spacer(1, 3 * mm))

    # Accesorios del acta
    accesorios_raw = acta.accesorios or ""
    acc_cargador   = "✓" if "cargador" in accesorios_raw.lower() else ""
    acc_auricular  = "✓" if "auricular" in accesorios_raw.lower() or "audífono" in accesorios_raw.lower() else ""
    acc_funda      = "✓" if "funda" in accesorios_raw.lower() else ""
    acc_chip       = "✓" if "chip" in accesorios_raw.lower() or "sim" in accesorios_raw.lower() else ""
    acc_caja       = "✓" if "caja" in accesorios_raw.lower() else ""

    header_specs = [
        Paragraph("<b>Descripción</b>",   styles["tabla_header"]),
        Paragraph("<b>Marca</b>",          styles["tabla_header"]),
        Paragraph("<b>Referencia</b>",     styles["tabla_header"]),
        Paragraph("<b>Características</b>",styles["tabla_header"]),
        Paragraph("<b>Estado</b>",         styles["tabla_header"]),
    ]

    def fila(desc, marca="", ref="", caract="", estado=""):
        return [
            Paragraph(desc,   styles["tabla_celda"]),
            Paragraph(marca,  styles["tabla_celda"]),
            Paragraph(ref,    styles["tabla_celda"]),
            Paragraph(caract, styles["tabla_celda"]),
            Paragraph(estado, styles["tabla_celda"]),
        ]

    ram_val = detalle.get("ram", "")

    filas_specs = [
        header_specs,
        fila(f"{modelo_val}".upper(), marca_val, "", str(linea_val)),
        fila("Memoria RAM",   "",         "",   ram_val),
        fila("", "", "", "", ""),
        fila("", "", "", "", ""),
        fila("", "", "", "", ""),
        fila("", "", "", "", ""),
        fila("", "", "", "", ""),
        fila("Accesorios:", "", "", "", ""),
        fila("Chip / SIM",       "",      "", acc_chip),
        fila("Cargador",         "",      "", acc_cargador),
        fila("Auriculares",      "",      "", acc_auricular),
        fila("Funda",            "",      "", acc_funda),
        fila("Caja original",    "",      "", acc_caja),
        fila("", "", "", "", ""),
    ]

    t_specs = Table(filas_specs, colWidths=[4.0*cm, 2.5*cm, 3.5*cm, 5.5*cm, 2.5*cm])
    t_specs.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0),  AZUL_CORP),
        ("TEXTCOLOR",      (0, 0), (-1, 0),  BLANCO),
        ("FONTNAME",       (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, -1), 8),
        ("FONTNAME",       (0, 8), (0, 8),   "Helvetica-Bold"),
        ("SPAN",           (0, 8), (-1, 8)),
        ("BACKGROUND",     (0, 8), (-1, 8),  AZUL_CLARO),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8FF")]),
        ("GRID",           (0, 0), (-1, -1), 0.4, GRIS_LINEA),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",     (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 3),
        ("LEFTPADDING",    (0, 0), (-1, -1), 4),
    ]))
    elems.append(t_specs)
    return elems


def _prueba_funcionalidad_computador(styles):
    """Sección 3 para computadores."""
    elems = [Paragraph("3.- PRUEBA DE FUNCIONALIDAD", styles["seccion"])]

    header = [
        Paragraph("<b>Descripción</b>",  styles["tabla_header"]),
        Paragraph("<b>Ok</b>",           styles["tabla_header_c"]),
        Paragraph("<b>Falla</b>",        styles["tabla_header_c"]),
        Paragraph("<b>Descripción</b>",  styles["tabla_header"]),
        Paragraph("<b>Ok</b>",           styles["tabla_header_c"]),
        Paragraph("<b>Falla</b>",        styles["tabla_header_c"]),
    ]

    def fila_prueba(iz, der):
        c = styles["tabla_celda"]
        b = styles["tabla_celda_check"]
        return [
            Paragraph(iz,  c), Paragraph("", b), Paragraph("", b),
            Paragraph(der, c), Paragraph("", b), Paragraph("", b),
        ]

    filas = [
        header,
        fila_prueba("Pruebas On/Off",        "Función Monitor"),
        fila_prueba("Función S.O.",           "Función Teclado"),
        fila_prueba("Función Aplicaciones",   "Función Mouse"),
        fila_prueba("Unidad Óptica",          "Prueba de Sonido"),
        fila_prueba("",                       ""),
    ]

    anchos = [5.5*cm, 1.5*cm, 1.5*cm, 5.5*cm, 1.5*cm, 2.5*cm]
    t = Table(filas, colWidths=anchos)
    t.setStyle(_estilo_prueba())
    elems.append(t)
    return elems


def _prueba_funcionalidad_telefono(styles):
    """Sección 3 para teléfonos."""
    elems = [Paragraph("3.- PRUEBA DE FUNCIONALIDAD", styles["seccion"])]

    header = [
        Paragraph("<b>Descripción</b>",  styles["tabla_header"]),
        Paragraph("<b>Ok</b>",           styles["tabla_header_c"]),
        Paragraph("<b>Falla</b>",        styles["tabla_header_c"]),
        Paragraph("<b>Descripción</b>",  styles["tabla_header"]),
        Paragraph("<b>Ok</b>",           styles["tabla_header_c"]),
        Paragraph("<b>Falla</b>",        styles["tabla_header_c"]),
    ]

    def fila_prueba(iz, der):
        c = styles["tabla_celda"]
        b = styles["tabla_celda_check"]
        return [
            Paragraph(iz,  c), Paragraph("", b), Paragraph("", b),
            Paragraph(der, c), Paragraph("", b), Paragraph("", b),
        ]

    filas = [
        header,
        fila_prueba("Pruebas On/Off",        "Función Cámara"),
        fila_prueba("Función S.O.",           "Función Bluetooth"),
        fila_prueba("Función Aplicaciones",   "Función WiFi"),
        fila_prueba("Función Llamadas",       "Prueba de Sonido"),
        fila_prueba("",                       ""),
    ]

    anchos = [5.5*cm, 1.5*cm, 1.5*cm, 5.5*cm, 1.5*cm, 2.5*cm]
    t = Table(filas, colWidths=anchos)
    t.setStyle(_estilo_prueba())
    elems.append(t)
    return elems


def _seccion_firmas(styles, acta, emp, responsable):
    """Bloque final: Entregado por / Recibido por."""

    responsable_nombre = ""
    responsable_cargo  = "Analista Soporte"
    if responsable:
        responsable_nombre = responsable.get_full_name() or responsable.username
        if hasattr(responsable, 'profile') and hasattr(responsable.profile, 'cargo'):
            responsable_cargo = responsable.profile.cargo

    col_entrega  = _bloque_firma(styles, acta.firma_responsable_imagen, responsable_nombre, responsable_cargo, "Entregado por:")
    col_recibido = _bloque_firma(styles, acta.firma_empleado_imagen,    emp.get_full_name(), emp.cargo or "",  "Recibido por:")

    t = Table([[col_entrega, col_recibido]], colWidths=[9 * cm, 9 * cm])
    t.setStyle(TableStyle([
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX",    (0, 0), (-1, -1), 0.5, GRIS_LINEA),
        ("LINEAFTER",  (0, 0), (0, 0), 0.5, GRIS_LINEA),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [KeepTogether([t])]


def _bloque_firma(styles, firma_b64, nombre, cargo, label):
    """Genera el contenido de una celda de firma."""
    elems = []
    elems.append(Paragraph(f"<b>{label}</b>", styles["firma_label"]))
    elems.append(Spacer(1, 2 * mm))

    # Imagen de firma si existe
    if firma_b64 and firma_b64.startswith("data:image"):
        try:
            _, data = firma_b64.split(",", 1)
            img = Image(io.BytesIO(base64.b64decode(data)), width=4.5 * cm, height=2 * cm)
            elems.append(img)
        except Exception:
            elems.append(Spacer(1, 2 * cm))
    else:
        elems.append(Spacer(1, 2 * cm))

    # Línea de firma
    d = Drawing(180, 4)
    d.add(Line(10, 2, 170, 2))
    elems.append(d)
    elems.append(Spacer(1, 1 * mm))
    elems.append(Paragraph(nombre.upper() if nombre else "___________________", styles["firma_nombre"]))
    elems.append(Paragraph(cargo or "", styles["firma_cargo"]))

    inner = Table([[e] for e in elems], colWidths=[8 * cm])
    inner.setStyle(TableStyle([
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return inner


def _firma_digital_pie(styles, acta):
    """Bloque de verificación de firma digital."""
    elems = [
        Spacer(1, 8 * mm),
        HRFlowable(width="100%", thickness=0.5, color=GRIS_LINEA),
        Spacer(1, 3 * mm),
        Paragraph(
            f"<b>Firma Digital SHA-256:</b> {acta.firma_digital_hash[:32]}..."
            f"  |  <b>Timestamp:</b> {acta.firma_digital_timestamp.strftime('%d/%m/%Y %H:%M:%S') if acta.firma_digital_timestamp else 'N/A'}"
            f"  |  <b>Válida:</b> {'Sí' if acta.firma_digital_valida else 'No'}",
            styles["pie"],
        ),
    ]
    return elems


# ═════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _es_equipo_telefonico(acta, detalle):
    """Detecta si el equipo es telefónico o un chip/SIM."""
    content_type_model = ""
    if acta.content_type:
        content_type_model = acta.content_type.model.lower()

    if content_type_model in ("celular", "chip"):
        return True
    tipo = str(detalle.get("tipo_equipo", detalle.get("tipo", ""))).lower()
    return tipo in ("smartphone", "tablet", "celular", "chip")


def _estilo_tabla_datos():
    return TableStyle([
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",      (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("BACKGROUND",    (0, 0), (0, -1), AZUL_CLARO),
        ("GRID",          (0, 0), (-1, -1), 0.4, GRIS_LINEA),
    ])


def _estilo_prueba():
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  AZUL_CORP),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  BLANCO),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.4, GRIS_LINEA),
        ("ALIGN",         (1, 0), (2, -1),  "CENTER"),
        ("ALIGN",         (4, 0), (5, -1),  "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8FF")]),
        # Línea divisoria vertical central
        ("LINEAFTER",     (2, 0), (2, -1),  1.0, AZUL_CORP),
    ])


def _estilos():
    base = getSampleStyleSheet()
    return {
        "empresa_nombre": ParagraphStyle(
            "empresa_nombre", parent=base["Normal"],
            fontSize=13, fontName="Helvetica-Bold",
            textColor=AZUL_CORP, alignment=TA_CENTER,
        ),
        "empresa_logo_texto": ParagraphStyle(
            "empresa_logo_texto", parent=base["Normal"],
            fontSize=10, fontName="Helvetica-Bold",
            textColor=AZUL_CORP, alignment=TA_CENTER,
        ),
        "titulo": ParagraphStyle(
            "titulo", parent=base["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=NEGRO, alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "header_derecha": ParagraphStyle(
            "header_derecha", parent=base["Normal"],
            fontSize=8, alignment=TA_RIGHT,
            textColor=GRIS_TEXTO, leading=11,
        ),
        "header_derecha_web": ParagraphStyle(
            "header_derecha_web", parent=base["Normal"],
            fontSize=8, alignment=TA_RIGHT,
            textColor=AZUL_CORP, leading=11,
        ),
        "cuerpo": ParagraphStyle(
            "cuerpo", parent=base["Normal"],
            fontSize=9, alignment=TA_JUSTIFY,
            leading=13, textColor=NEGRO,
        ),
        "seccion": ParagraphStyle(
            "seccion", parent=base["Normal"],
            fontSize=10, fontName="Helvetica-Bold",
            textColor=BLANCO, alignment=TA_LEFT,
            backColor=AZUL_CORP,
            leftIndent=-4, rightIndent=-4,
            spaceAfter=3, spaceBefore=6,
            borderPad=4,
        ),
        "tabla_label": ParagraphStyle(
            "tabla_label", parent=base["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
        ),
        "tabla_valor": ParagraphStyle(
            "tabla_valor", parent=base["Normal"],
            fontSize=9,
        ),
        "tabla_header": ParagraphStyle(
            "tabla_header", parent=base["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=BLANCO,
        ),
        "tabla_header_c": ParagraphStyle(
            "tabla_header_c", parent=base["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=BLANCO, alignment=TA_CENTER,
        ),
        "tabla_celda": ParagraphStyle(
            "tabla_celda", parent=base["Normal"],
            fontSize=8,
        ),
        "tabla_celda_check": ParagraphStyle(
            "tabla_celda_check", parent=base["Normal"],
            fontSize=8, alignment=TA_CENTER,
        ),
        "firma_label": ParagraphStyle(
            "firma_label", parent=base["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            alignment=TA_CENTER, textColor=GRIS_TEXTO,
        ),
        "firma_nombre": ParagraphStyle(
            "firma_nombre", parent=base["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            alignment=TA_CENTER,
        ),
        "firma_cargo": ParagraphStyle(
            "firma_cargo", parent=base["Normal"],
            fontSize=8, textColor=GRIS_TEXTO,
            alignment=TA_CENTER,
        ),
        "pie": ParagraphStyle(
            "pie", parent=base["Normal"],
            fontSize=7, textColor=GRIS_TEXTO,
            alignment=TA_CENTER,
        ),
    }
