"""
Comando: resetear_inventario
Uso: docker exec inventario_web python manage.py resetear_inventario

Borra TODOS los datos del inventario excepto los usuarios Django (auth.User).
Incluye: equipos, empleados, centros de costo, áreas y todos los catálogos.

Pide confirmación antes de borrar. Para saltarse la confirmación usar --forzar.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction


class Command(BaseCommand):
    help = "Elimina todos los datos del inventario excepto usuarios Django."

    def add_arguments(self, parser):
        parser.add_argument(
            "--forzar",
            action="store_true",
            help="Omite la confirmación interactiva.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        w = self.stdout.write
        err = self.style.ERROR
        ok  = self.style.SUCCESS
        warn = self.style.WARNING

        # ── Importar modelos aquí para evitar importación circular ──
        from inventory.models import (
            ComputadorSoftware, Computador, Celular, Chip, Monitor,
            Empleado, CentroCosto, Area,
            Marca, Modelo, Procesador, Ram, Almacenamiento,
            SistemaOperativo, Software,
        )

        # Detectar si existen apps opcionales
        apps_extra = []
        try:
            from mantenimiento.models import Mantenimiento
            apps_extra.append(("Mantenimientos", Mantenimiento))
        except ImportError:
            pass
        try:
            from actas.models import Acta
            apps_extra.append(("Actas de Entrega", Acta))
        except ImportError:
            pass

        w("\n╔══════════════════════════════════════════════╗")
        w("║        RESET DE INVENTARIO TI                ║")
        w("╚══════════════════════════════════════════════╝\n")

        # Mostrar resumen de lo que se va a borrar
        conteos = [
            ("Actas de Entrega",   apps_extra[1][1].objects.count() if len(apps_extra) > 1 else 0),
            ("Mantenimientos",     apps_extra[0][1].objects.count() if apps_extra else 0),
            ("Software instalado", ComputadorSoftware.objects.count()),
            ("Computadores",       Computador.objects.count()),
            ("Celulares",          Celular.objects.count()),
            ("Chips / SIM",        Chip.objects.count()),
            ("Monitores",          Monitor.objects.count()),
            ("Empleados",          Empleado.objects.count()),
            ("Centros de Costo",   CentroCosto.objects.count()),
            ("Áreas",              Area.objects.count()),
            ("Marcas",             Marca.objects.count()),
            ("Modelos",            Modelo.objects.count()),
            ("Procesadores",       Procesador.objects.count()),
            ("Memorias RAM",       Ram.objects.count()),
            ("Almacenamientos",    Almacenamiento.objects.count()),
            ("Sistemas Operativos",SistemaOperativo.objects.count()),
            ("Software (catálogo)",Software.objects.count()),
        ]

        w(warn("  Se eliminarán los siguientes registros:\n"))
        total = 0
        for nombre, cantidad in conteos:
            if cantidad:
                w(f"    · {nombre:<25} {cantidad:>5} registros")
                total += cantidad
        w(f"\n    {'TOTAL':<25} {total:>5} registros")

        usuarios = User.objects.count()
        w(ok(f"\n  ✔ Usuarios Django:              {usuarios} (NO se tocarán)\n"))

        if total == 0:
            w(ok("  ✅ La base de datos ya está vacía. Nada que borrar."))
            return

        # ── Confirmación ──────────────────────────────────────────
        if not options["forzar"]:
            w(warn("  ⚠️  Esta acción es IRREVERSIBLE."))
            respuesta = input("  Escribe CONFIRMAR para continuar: ").strip()
            if respuesta != "CONFIRMAR":
                w(err("  ❌ Cancelado. No se borró nada."))
                return

        # ── Borrado en orden (respetando FK) ─────────────────────
        w("\n  Borrando datos...")

        with transaction.atomic():
            # Actas primero (FK protegida a Empleado)
            try:
                from actas.models import ActaEntrega
                n = ActaEntrega.objects.all().delete()[0]
                if n: w(f"    ✓ Actas de Entrega: {n} eliminados")
            except Exception as e:
                w(self.style.WARNING(f"    ⚠ Actas: {e}"))

            # Mantenimientos
            try:
                from mantenimiento.models import Mantenimiento
                n = Mantenimiento.objects.all().delete()[0]
                if n: w(f"    ✓ Mantenimientos: {n} eliminados")
            except ImportError:
                pass

            # Equipos y relaciones
            for nombre, Model in [
                ("Software instalado", ComputadorSoftware),
                ("Computadores",       Computador),
                ("Celulares",          Celular),
                ("Chips / SIM",        Chip),
                ("Monitores",          Monitor),
                ("Empleados",          Empleado),
                ("Centros de Costo",   CentroCosto),
                ("Áreas",              Area),
            ]:
                n = Model.objects.all().delete()[0]
                if n:
                    w(f"    ✓ {nombre}: {n} eliminados")

            # Catálogos (sin FK entrantes ahora)
            for nombre, Model in [
                ("Modelos",             Modelo),
                ("Marcas",              Marca),
                ("Procesadores",        Procesador),
                ("Memorias RAM",        Ram),
                ("Almacenamientos",     Almacenamiento),
                ("Sistemas Operativos", SistemaOperativo),
                ("Software (catálogo)", Software),
            ]:
                n = Model.objects.all().delete()[0]
                if n:
                    w(f"    ✓ {nombre}: {n} eliminados")

        w("\n" + ok(
            "╔══════════════════════════════════════════════╗\n"
            "║  ✅ Reset completo. Base de datos limpia.    ║\n"
            "╠══════════════════════════════════════════════╣\n"
            "║  Próximo paso:                               ║\n"
            "║  python manage.py cargar_catalogos           ║\n"
            "╚══════════════════════════════════════════════╝"
        ))
