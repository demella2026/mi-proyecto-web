"""
Comando: cargar_catalogos
Uso: docker exec inventario_web python manage.py cargar_catalogos

Carga todos los catálogos base del sistema de inventario TI:
  - Marcas, Modelos
  - Procesadores, RAM, Almacenamiento
  - Sistemas Operativos, Software
  - Áreas y Centros de Costo

Es seguro ejecutarlo múltiples veces (usa get_or_create en todo).
"""

from django.core.management.base import BaseCommand
from inventory.models import (
    Marca, Modelo, TipoEquipoModelo,
    Procesador, Ram, Almacenamiento, TipoAlmacenamiento,
    SistemaOperativo, Software,
    Area, CentroCosto, TipoCentroCosto,
)


class Command(BaseCommand):
    help = "Carga catálogos base del inventario TI (idempotente)."

    def handle(self, *args, **options):
        w = self.stdout.write
        ok = self.style.SUCCESS
        w("╔══════════════════════════════════════════════╗")
        w("║     Cargando catálogos — Inventario TI       ║")
        w("╚══════════════════════════════════════════════╝\n")

        # ────────────────────────────────────────────────
        #  1. MARCAS
        # ────────────────────────────────────────────────
        marcas_lista = [
            # Computadores / Laptops
            "Dell", "HP", "Lenovo", "Apple", "Asus", "Acer", "MSI", "Toshiba",
            # Celulares / Tablets
            "Samsung", "Huawei", "Motorola", "Xiaomi",
            # Monitores
            "LG", "ViewSonic", "BenQ",
        ]
        marcas = {}
        nuevas = 0
        for nombre in marcas_lista:
            obj, created = Marca.objects.get_or_create(nombre=nombre)
            marcas[nombre] = obj
            if created:
                nuevas += 1
        w(ok(f"  ✔ Marcas          → {nuevas} nuevas  |  {Marca.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  2. MODELOS
        # ────────────────────────────────────────────────
        C = TipoEquipoModelo.COMPUTADOR
        CEL = TipoEquipoModelo.CELULAR
        MON = TipoEquipoModelo.MONITOR

        modelos_data = [
            # (Marca, Nombre, Tipo)
            # ── Dell Computadores
            ("Dell", "Latitude 3540",    C),
            ("Dell", "Latitude 5540",    C),
            ("Dell", "Latitude 5530",    C),
            ("Dell", "Latitude 5520",    C),
            ("Dell", "OptiPlex 3000",    C),
            ("Dell", "OptiPlex 7010",    C),
            ("Dell", "Precision 3571",   C),
            # ── Dell Monitores
            ("Dell", "P2422H",           MON),
            ("Dell", "P2422HE",          MON),
            ("Dell", "U2422H",           MON),
            ("Dell", "P2722H",           MON),
            # ── HP Computadores
            ("HP", "ProBook 450 G9",     C),
            ("HP", "ProBook 450 G10",    C),
            ("HP", "EliteBook 840 G9",   C),
            ("HP", "EliteBook 840 G10",  C),
            ("HP", "ProDesk 600 G6",     C),
            ("HP", "ProDesk 405 G8",     C),
            # ── Lenovo Computadores
            ("Lenovo", "ThinkPad E15 Gen 4", C),
            ("Lenovo", "ThinkPad T14 Gen 4", C),
            ("Lenovo", "ThinkPad L14 Gen 4", C),
            ("Lenovo", "IdeaPad 3 15",       C),
            ("Lenovo", "V15 G4",             C),
            # ── Apple Computadores
            ("Apple", "MacBook Air M1",      C),
            ("Apple", "MacBook Air M2",      C),
            ("Apple", "MacBook Pro 14 M2",   C),
            ("Apple", "MacBook Pro 14 M3",   C),
            # ── Apple Celulares
            ("Apple", "iPhone 14",           CEL),
            ("Apple", "iPhone 15",           CEL),
            ("Apple", "iPhone 15 Pro",       CEL),
            # ── Asus Computadores
            ("Asus", "ExpertBook B1 B1502",  C),
            ("Asus", "ZenBook 14 UX425",     C),
            # ── Acer Computadores
            ("Acer", "Aspire 5 A515",        C),
            ("Acer", "TravelMate P4",        C),
            # ── MSI Computadores
            ("MSI", "Modern 14",             C),
            ("MSI", "Prestige 14",           C),
            # ── Samsung Celulares / Tablets
            ("Samsung", "Galaxy A34",        CEL),
            ("Samsung", "Galaxy A54",        CEL),
            ("Samsung", "Galaxy A15",        CEL),
            ("Samsung", "Galaxy S23",        CEL),
            ("Samsung", "Galaxy S24",        CEL),
            ("Samsung", "Galaxy Tab A8",     CEL),
            ("Samsung", "Galaxy Tab A9",     CEL),
            # ── Samsung Monitores
            ("Samsung", "S27A400",           MON),
            ("Samsung", "M27A400",           MON),
            ("Samsung", "S24A336",           MON),
            # ── Huawei Celulares
            ("Huawei", "P30 Lite",           CEL),
            ("Huawei", "Nova 5T",            CEL),
            ("Huawei", "MatePad T10s",       CEL),
            # ── Motorola Celulares
            ("Motorola", "Moto G54",         CEL),
            ("Motorola", "Moto G84",         CEL),
            ("Motorola", "Moto G23",         CEL),
            # ── Xiaomi Celulares
            ("Xiaomi", "Redmi Note 12",      CEL),
            ("Xiaomi", "Redmi Note 13",      CEL),
            ("Xiaomi", "Redmi 13C",          CEL),
            # ── LG Monitores
            ("LG", "27UK650-W",              MON),
            ("LG", "27BN650-B",              MON),
            ("LG", "24MK430H",               MON),
            # ── ViewSonic Monitores
            ("ViewSonic", "VA2715-H",        MON),
            ("ViewSonic", "VX2758-2KP",      MON),
            ("ViewSonic", "VA2406-H",        MON),
            # ── BenQ Monitores
            ("BenQ", "GW2480",               MON),
            ("BenQ", "EW2480",               MON),
        ]
        modelos = {}
        nuevos = 0
        for marca_n, modelo_n, tipo in modelos_data:
            if marca_n not in marcas:
                continue
            obj, created = Modelo.objects.get_or_create(
                nombre=modelo_n,
                marca=marcas[marca_n],
                defaults={"tipo_equipo": tipo},
            )
            # Si ya existía pero sin tipo_equipo correcto, actualizarlo
            if not created and obj.tipo_equipo != tipo:
                obj.tipo_equipo = tipo
                obj.save(update_fields=["tipo_equipo"])
            modelos[modelo_n] = obj
            if created:
                nuevos += 1
        w(ok(f"  ✔ Modelos         → {nuevos} nuevos  |  {Modelo.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  3. PROCESADORES
        # ────────────────────────────────────────────────
        procesadores_lista = [
            # Intel 12a gen
            "Intel Core i3-1215U",
            "Intel Core i5-1235U",
            "Intel Core i5-1240P",
            "Intel Core i7-1255U",
            "Intel Core i7-1265U",
            # Intel 13a gen
            "Intel Core i5-1335U",
            "Intel Core i5-1345U",
            "Intel Core i7-1355U",
            "Intel Core i7-1365U",
            # Intel desktop
            "Intel Core i5-12400",
            "Intel Core i5-13400",
            "Intel Core i7-12700",
            # AMD
            "AMD Ryzen 5 5600U",
            "AMD Ryzen 5 7530U",
            "AMD Ryzen 7 5700U",
            "AMD Ryzen 7 7730U",
            # Apple Silicon
            "Apple M1",
            "Apple M2",
            "Apple M3",
            # Gama entrada
            "Intel Core i3-1005G1",
            "Intel Pentium Silver N6000",
            "Intel Celeron N4500",
        ]
        procesadores = {}
        nuevos = 0
        for nombre in procesadores_lista:
            obj, created = Procesador.objects.get_or_create(nombre=nombre)
            procesadores[nombre] = obj
            if created:
                nuevos += 1
        w(ok(f"  ✔ Procesadores    → {nuevos} nuevos  |  {Procesador.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  4. RAM
        # ────────────────────────────────────────────────
        rams_lista = [
            # (capacidad, part_number)
            ("4 GB DDR4",   None),
            ("6 GB LPDDR4", None),
            ("8 GB DDR4",   None),
            ("8 GB LPDDR4", None),
            ("12 GB LPDDR4",None),
            ("16 GB DDR4",  None),
            ("16 GB DDR5",  None),
            ("16 GB LPDDR5",None),
            ("32 GB DDR4",  None),
            ("32 GB DDR5",  None),
            # Configuraciones Apple
            ("8 GB Unificada",  None),
            ("16 GB Unificada", None),
            ("32 GB Unificada", None),
        ]
        rams = {}
        nuevos = 0
        for cap, pn in rams_lista:
            defaults = {}
            if pn:
                defaults["part_number"] = pn
            obj, created = Ram.objects.get_or_create(capacidad=cap, defaults=defaults)
            rams[cap] = obj
            if created:
                nuevos += 1
        w(ok(f"  ✔ RAM             → {nuevos} nuevas  |  {Ram.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  5. ALMACENAMIENTO
        # ────────────────────────────────────────────────
        almacs_data = [
            # (tipo, capacidad, nombre_modelo)
            (TipoAlmacenamiento.SSD,  "128 GB",  None),
            (TipoAlmacenamiento.SSD,  "256 GB",  None),
            (TipoAlmacenamiento.SSD,  "512 GB",  None),
            (TipoAlmacenamiento.SSD,  "1 TB",    None),
            (TipoAlmacenamiento.HDD,  "500 GB",  None),
            (TipoAlmacenamiento.HDD,  "1 TB",    None),
            (TipoAlmacenamiento.HDD,  "2 TB",    None),
            (TipoAlmacenamiento.NVME, "256 GB",  "Samsung 980"),
            (TipoAlmacenamiento.NVME, "512 GB",  "Samsung 980"),
            (TipoAlmacenamiento.NVME, "512 GB",  "WD Black SN770"),
            (TipoAlmacenamiento.NVME, "1 TB",    "Samsung 970 EVO Plus"),
            (TipoAlmacenamiento.NVME, "1 TB",    "WD Black SN770"),
            (TipoAlmacenamiento.EMMC, "64 GB",   None),
            (TipoAlmacenamiento.EMMC, "128 GB",  None),
        ]
        almacs = {}
        nuevos = 0
        for tipo, cap, nm in almacs_data:
            defaults = {}
            if nm:
                defaults["nombre_modelo"] = nm
            obj, created = Almacenamiento.objects.get_or_create(
                tipo=tipo, capacidad=cap, defaults=defaults
            )
            key = f"{cap} {tipo}"
            if nm:
                key = f"{cap} {tipo} ({nm})"
            almacs[key] = obj
            if created:
                nuevos += 1
        w(ok(f"  ✔ Almacenamiento  → {nuevos} nuevos  |  {Almacenamiento.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  6. SISTEMAS OPERATIVOS
        # ────────────────────────────────────────────────
        so_lista = [
            "Windows 10 Pro",
            "Windows 10 Home",
            "Windows 11 Pro",
            "Windows 11 Home",
            "Windows 11 Pro for Workstations",
            "macOS Ventura (13)",
            "macOS Sonoma (14)",
            "macOS Sequoia (15)",
            "Ubuntu 22.04 LTS",
            "Ubuntu 24.04 LTS",
        ]
        nuevos = 0
        for nombre in so_lista:
            _, created = SistemaOperativo.objects.get_or_create(nombre=nombre)
            if created:
                nuevos += 1
        w(ok(f"  ✔ Sist. Operativo → {nuevos} nuevos  |  {SistemaOperativo.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  7. SOFTWARE
        # ────────────────────────────────────────────────
        software_data = [
            # (nombre, fabricante)
            ("Microsoft 365 Apps",              "Microsoft"),
            ("Microsoft Teams",                 "Microsoft"),
            ("Microsoft Visio 2021",            "Microsoft"),
            ("Microsoft Project 2021",          "Microsoft"),
            ("Microsoft Office 2021 Pro Plus",  "Microsoft"),
            ("Adobe Acrobat Pro DC",            "Adobe"),
            ("Adobe Acrobat Reader",            "Adobe"),
            ("AutoCAD 2024",                    "Autodesk"),
            ("AutoCAD LT 2024",                 "Autodesk"),
            ("Civil 3D 2024",                   "Autodesk"),
            ("ESET Endpoint Security",          "ESET"),
            ("ESET Endpoint Antivirus",         "ESET"),
            ("Trend Micro Apex One",            "Trend Micro"),
            ("Zoom Workplace",                  "Zoom"),
            ("Google Chrome Enterprise",        "Google"),
            ("Mozilla Firefox ESR",             "Mozilla"),
            ("7-Zip",                           "Igor Pavlov"),
            ("WinRAR",                          "RARLAB"),
            ("VPN GlobalProtect",               "Palo Alto Networks"),
            ("FortiClient VPN",                 "Fortinet"),
            ("AnyDesk",                         "AnyDesk Software"),
            ("TeamViewer",                      "TeamViewer"),
            ("Notepad++",                       "Don Ho"),
            ("PuTTY",                           "Simon Tatham"),
            ("WinSCP",                          "Martin Prikryl"),
            ("SAP GUI 7.70",                    "SAP"),
            ("Power BI Desktop",                "Microsoft"),
            ("Slack",                           "Slack Technologies"),
        ]
        nuevos = 0
        for nombre, fabricante in software_data:
            _, created = Software.objects.get_or_create(
                nombre=nombre,
                defaults={"fabricante": fabricante},
            )
            if created:
                nuevos += 1
        w(ok(f"  ✔ Software        → {nuevos} nuevos  |  {Software.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  8. ÁREAS
        # ────────────────────────────────────────────────
        areas_data = [
            ("Gerencia General",             "Dirección y alta administración de la empresa."),
            ("Administración y Finanzas",    "Gestión administrativa, contabilidad y finanzas corporativas."),
            ("Recursos Humanos",             "Gestión de personas, contratos, remuneraciones y bienestar."),
            ("Tecnologías de la Información","Infraestructura TI, soporte técnico y sistemas de información."),
            ("Ingeniería",                   "Diseño y desarrollo de ingeniería para proyectos eléctricos."),
            ("Obras Eléctricas",             "Ejecución de obras de tendido y subestaciones eléctricas."),
            ("Operación y Mantenimiento",    "Mantenimiento de activos eléctricos en servicio."),
            ("Logística y Abastecimiento",   "Gestión de bodega, compras y transporte de materiales."),
            ("Proyectos Especiales",         "Proyectos de gran envergadura o de carácter estratégico."),
            ("Control de Gestión",           "Seguimiento de presupuestos, KPIs y reporting ejecutivo."),
            ("Calidad, HSE y Medio Ambiente","Seguridad, salud ocupacional, calidad y medioambiente."),
        ]
        areas = {}
        nuevas = 0
        for nombre, desc in areas_data:
            obj, created = Area.objects.get_or_create(
                nombre=nombre,
                defaults={"descripcion": desc},
            )
            areas[nombre] = obj
            if created:
                nuevas += 1
        w(ok(f"  ✔ Áreas           → {nuevas} nuevas  |  {Area.objects.count()} total"))

        # ────────────────────────────────────────────────
        #  9. CENTROS DE COSTO
        # ────────────────────────────────────────────────
        cc_data = [
            # (codigo, nombre, tipo, area)
            # ── Administración
            ("CC-ADM-001", "Administración Central",                   TipoCentroCosto.ADMINISTRACION, "Administración y Finanzas"),
            ("CC-ADM-002", "Gerencia General",                         TipoCentroCosto.ADMINISTRACION, "Gerencia General"),
            ("CC-TI-001",  "Departamento TI",                          TipoCentroCosto.ADMINISTRACION, "Tecnologías de la Información"),
            ("CC-RRHH-001","Recursos Humanos",                         TipoCentroCosto.ADMINISTRACION, "Recursos Humanos"),
            ("CC-LOG-001", "Logística y Bodega Central",               TipoCentroCosto.ADMINISTRACION, "Logística y Abastecimiento"),
            ("CC-CDG-001", "Control de Gestión",                       TipoCentroCosto.ADMINISTRACION, "Control de Gestión"),
            # ── Líneas de Transmisión
            ("CC-LT-001",  "L.T. 220 kV Polpaico – Cerro Navia",      TipoCentroCosto.LINEA,          "Obras Eléctricas"),
            ("CC-LT-002",  "L.T. 110 kV Antofagasta – Mejillones",    TipoCentroCosto.LINEA,          "Obras Eléctricas"),
            ("CC-LT-003",  "L.T. 220 kV Cardones – Mejillones",       TipoCentroCosto.LINEA,          "Obras Eléctricas"),
            ("CC-LT-004",  "L.T. 220 kV Parinas – Encuentro",         TipoCentroCosto.LINEA,          "Obras Eléctricas"),
            ("CC-LT-005",  "L.T. 66 kV La Serena – Coquimbo",         TipoCentroCosto.LINEA,          "Obras Eléctricas"),
            # ── Subestaciones
            ("CC-SE-001",  "S/E Chillán 110 kV",                      TipoCentroCosto.SUBESTACION,    "Obras Eléctricas"),
            ("CC-SE-002",  "S/E Punta Arenas 220 kV",                  TipoCentroCosto.SUBESTACION,    "Obras Eléctricas"),
            ("CC-SE-003",  "S/E Atacama 500 kV – Ampliación",         TipoCentroCosto.SUBESTACION,    "Obras Eléctricas"),
            ("CC-SE-004",  "S/E Los Vilos 110 kV",                    TipoCentroCosto.SUBESTACION,    "Obras Eléctricas"),
            # ── Operación y Mantenimiento
            ("CC-OM-001",  "O&M Zona Norte (I–II Región)",             TipoCentroCosto.OPERACION,      "Operación y Mantenimiento"),
            ("CC-OM-002",  "O&M Zona Centro (V–VII Región)",           TipoCentroCosto.OPERACION,      "Operación y Mantenimiento"),
            ("CC-OM-003",  "O&M Zona Sur (VIII–X Región)",             TipoCentroCosto.OPERACION,      "Operación y Mantenimiento"),
            ("CC-OM-004",  "O&M Zona Austral (XI–XII Región)",         TipoCentroCosto.OPERACION,      "Operación y Mantenimiento"),
            # ── Proyectos Especiales / Energías Renovables
            ("CC-PE-001",  "Proyecto FV Atacama 100 MW",               TipoCentroCosto.OTRO,           "Proyectos Especiales"),
            ("CC-PE-002",  "Proyecto Parque Eólico Chiloé",            TipoCentroCosto.OTRO,           "Proyectos Especiales"),
            ("CC-PE-003",  "Proyecto BESS Mejillones 20 MWh",          TipoCentroCosto.OTRO,           "Proyectos Especiales"),
        ]
        nuevos = 0
        for codigo, nombre, tipo, area_nombre in cc_data:
            area_obj = areas.get(area_nombre)
            if not area_obj:
                continue
            _, created = CentroCosto.objects.get_or_create(
                codigo=codigo,
                defaults={
                    "nombre": nombre,
                    "tipo":   tipo,
                    "area":   area_obj,
                    "activo": True,
                },
            )
            if created:
                nuevos += 1
        w(ok(f"  ✔ Centros de Costo→ {nuevos} nuevos  |  {CentroCosto.objects.count()} total"))

        # ── Resumen final ────────────────────────────────
        w("\n" + ok(
            "╔══════════════════════════════════════════════╗\n"
            "║          ✅  Catálogos cargados              ║\n"
            "╚══════════════════════════════════════════════╝"
        ))
