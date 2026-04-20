"""
Comando: cargar_obras
=====================
Carga masiva de Centros de Costo desde el archivo "Obras Vivas 11032026.xlsx".

Uso:
    docker exec inventario_ti-web-1 python manage.py cargar_obras

El archivo Excel debe estar en la raíz del proyecto (junto a manage.py).
Para cargarlo desde otra ruta usar --archivo:
    docker exec inventario_ti-web-1 python manage.py cargar_obras --archivo /ruta/al/archivo.xlsx

Comportamiento:
    - Crea las Áreas si no existen.
    - Usa get_or_create en cada CentroCosto → es seguro correr más de una vez
      (no duplica ni borra lo existente).
    - Solo procesa filas cuyo código tiene guion (19-0001, 30-0080, etc.)
      y cuyo nombre no esté marcado como "NO USAR".
"""

import os
import openpyxl
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from inventory.models import Area, CentroCosto, TipoCentroCosto


# ── Mapeo de prefijo numérico → (nombre de área, tipo de CC) ─────────────────
# La clave es el prefijo antes del guion (ej: "30" para "30-0088")
PREFIX_MAP = {
    "19": ("Administración",            TipoCentroCosto.ADMINISTRACION),
    "20": ("Energías Renovables",       TipoCentroCosto.OTRO),
    "30": ("Alumbrado Público",         TipoCentroCosto.OTRO),
    "40": ("Mantenimiento",             TipoCentroCosto.OPERACION),
    "50": ("Telecomunicaciones",        TipoCentroCosto.OTRO),
    "75": ("Especiales y Compartidos",  TipoCentroCosto.OTRO),
    "80": ("Energía - Subestaciones",   TipoCentroCosto.SUBESTACION),
    "85": ("Energía - Subestaciones",   TipoCentroCosto.SUBESTACION),
    "90": ("Energía - Líneas",          TipoCentroCosto.LINEA),
    "95": ("Energía - Líneas",          TipoCentroCosto.LINEA),
    "99": ("Energía - Líneas",          TipoCentroCosto.LINEA),
}
DEFAULT_AREA  = "Otro"
DEFAULT_TIPO  = TipoCentroCosto.OTRO


def _parse_obras(filepath: str):
    """
    Lee el Excel y retorna lista de dicts con codigo/nombre/area_nombre/tipo.
    Filtra filas inválidas, sin guion, sin nombre o marcadas 'NO USAR'.
    """
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active
    obras = []

    for row in ws.iter_rows(values_only=True):
        codigo_raw, nombre_raw = row[0], row[1]

        # El código debe ser string con guion
        if not isinstance(codigo_raw, str):
            continue
        codigo = codigo_raw.strip()
        if "-" not in codigo:
            continue

        # Nombre obligatorio
        if not nombre_raw:
            continue
        nombre = str(nombre_raw).strip()

        # Excluir marcados como "NO USAR" o fórmulas (=100%-...)
        nombre_lower = nombre.lower()
        if "no usar" in nombre_lower or nombre.startswith("="):
            continue

        # Determinar área y tipo según prefijo
        prefijo = codigo.split("-")[0].lstrip("0") or "0"
        # Normalizar: si el prefijo tiene ceros a la izquierda quedaría vacío
        prefijo_key = codigo.split("-")[0]  # ej: "30", "40", "80"
        area_nombre, tipo = PREFIX_MAP.get(prefijo_key, (DEFAULT_AREA, DEFAULT_TIPO))

        obras.append({
            "codigo":      codigo,
            "nombre":      nombre,
            "area_nombre": area_nombre,
            "tipo":        tipo,
        })

    wb.close()
    return obras


class Command(BaseCommand):
    help = "Carga masiva de Centros de Costo desde Obras Vivas 11032026.xlsx"

    def add_arguments(self, parser):
        parser.add_argument(
            "--archivo",
            default=None,
            help="Ruta al archivo .xlsx (por defecto busca en BASE_DIR)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra lo que haría sin escribir en la base de datos",
        )

    def handle(self, *args, **options):
        # ── Localizar archivo ────────────────────────────────────────────────
        filepath = options["archivo"]
        if not filepath:
            from django.conf import settings
            filepath = os.path.join(settings.BASE_DIR, "Obras Vivas 11032026.xlsx")

        if not os.path.exists(filepath):
            raise CommandError(
                f"Archivo no encontrado: {filepath}\n"
                "Cópialo al servidor o usa --archivo /ruta/completa.xlsx"
            )

        self.stdout.write(f"Leyendo: {filepath}")
        obras = _parse_obras(filepath)
        self.stdout.write(f"Obras válidas encontradas: {len(obras)}")

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("--- DRY RUN (sin cambios en BD) ---"))
            for o in obras:
                self.stdout.write(f"  [{o['tipo']:15}] {o['codigo']:12} | {o['area_nombre']:30} | {o['nombre']}")
            return

        # ── Crear en base de datos (transacción atómica) ─────────────────────
        creados_cc  = 0
        actualizados = 0
        creadas_areas = 0
        area_cache: dict[str, Area] = {}

        with transaction.atomic():
            for obra in obras:
                # Área: get_or_create con cache local
                an = obra["area_nombre"]
                if an not in area_cache:
                    area, created = Area.objects.get_or_create(nombre=an)
                    area_cache[an] = area
                    if created:
                        creadas_areas += 1
                        self.stdout.write(f"  + Área creada: {an}")
                else:
                    area = area_cache[an]

                # Centro de Costo
                cc, created = CentroCosto.objects.get_or_create(
                    codigo=obra["codigo"],
                    defaults={
                        "nombre": obra["nombre"],
                        "tipo":   obra["tipo"],
                        "area":   area,
                        "activo": True,
                    },
                )
                if created:
                    creados_cc += 1
                else:
                    # Actualizar nombre si cambió (no cambia tipo ni área)
                    if cc.nombre != obra["nombre"]:
                        cc.nombre = obra["nombre"]
                        cc.save(update_fields=["nombre"])
                        actualizados += 1

        # ── Resumen ──────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("✓ Carga completada"))
        self.stdout.write(f"  Áreas creadas:           {creadas_areas}")
        self.stdout.write(f"  Centros de Costo nuevos: {creados_cc}")
        self.stdout.write(f"  Nombres actualizados:    {actualizados}")
        self.stdout.write(f"  Total procesados:        {len(obras)}")
