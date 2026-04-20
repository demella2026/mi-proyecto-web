"""
Comando de Django para sincronizar empleados desde Active Directory.

Estrategia:
- Base de busqueda: OU=OU_DEPTOS,<LDAP_BASE_DN>
- Recorre SOLO las sub-OUs de OU_DEPTOS (nivel 1 de profundidad).
- Cada sub-OU se mapea a un Area (get_or_create por nombre de OU).
- Se sincronizan SOLO: sAMAccountName, givenName, sn.
- Cargo y email NO provienen de AD; son gestionados manualmente en la app.
- Los empleados se identifican por objectGUID (nunca cambia en AD).

Uso:
    python manage.py sync_ldap_empleados
    python manage.py sync_ldap_empleados --dry-run
    python manage.py sync_ldap_empleados --desactivar-ausentes
    python manage.py sync_ldap_empleados --tipo-sync PROGRAMADO

REGLAS CLAVE:
- Nunca borra empleados, solo los marca activo=False.
- Si un empleado tiene equipos asignados (PROTECT), no se puede desactivar.
"""

import time
import logging
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

logger = logging.getLogger("ldapsync")

# Atributos minimos que se solicitan a AD
LDAP_ATTRS = ["objectGUID", "sAMAccountName", "givenName", "sn", "userAccountControl"]


class Command(BaseCommand):
    help = "Sincroniza empleados desde sub-OUs de OU_DEPTOS en Active Directory."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simula la sincronizacion sin hacer cambios.",
        )
        parser.add_argument(
            "--desactivar-ausentes",
            action="store_true",
            help="Desactiva empleados que ya no existen en AD.",
        )
        parser.add_argument(
            "--tipo-sync",
            type=str,
            default="MANUAL",
            choices=["MANUAL", "AUTOMATICO", "PROGRAMADO"],
            help="Tipo de sincronizacion para el log.",
        )

    def handle(self, *args, **options):
        start_time = time.time()
        dry_run = options["dry_run"]
        desactivar = options["desactivar_ausentes"]
        tipo_sync = options["tipo_sync"]

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "=== MODO DRY-RUN: No se haran cambios ==="
            ))

        try:
            import ldap
        except ImportError:
            raise CommandError(
                "La libreria python-ldap no esta instalada. "
                "Ejecuta: pip install python-ldap django-auth-ldap"
            )

        from ldapsync.models import SyncLog
        from inventory.models import Empleado, Area, Computador, Celular, Monitor, Chip

        from decouple import config as decouple_config

        server_uri = getattr(settings, "AUTH_LDAP_SERVER_URI", None)
        bind_dn = getattr(settings, "AUTH_LDAP_BIND_DN", "")
        bind_password = getattr(settings, "AUTH_LDAP_BIND_PASSWORD", "")
        ldap_base_dn = decouple_config("LDAP_BASE_DN", default="DC=elecnor,DC=local")
        deptos_ou = decouple_config("LDAP_DEPTOS_OU", default="OU=OU_DEPTOS")
        deptos_base = f"{deptos_ou},{ldap_base_dn}"

        if not server_uri or server_uri == "ldap://localhost:389":
            raise CommandError(
                "LDAP_SERVER_URI no esta configurado. "
                "Configura las variables de entorno LDAP en tu .env"
            )

        creados = 0
        actualizados = 0
        desactivados = 0
        protegidos = 0
        errores = []
        guids_en_ad = set()

        try:
            self.stdout.write(f"Conectando a {server_uri}...")
            conn = ldap.initialize(server_uri)
            conn.protocol_version = ldap.VERSION3
            conn.set_option(ldap.OPT_REFERRALS, 0)
            conn.set_option(ldap.OPT_NETWORK_TIMEOUT, 15)

            if getattr(settings, "AUTH_LDAP_START_TLS", False):
                conn.start_tls_s()

            conn.simple_bind_s(bind_dn, bind_password)
            self.stdout.write(self.style.SUCCESS("Conexion exitosa."))

            # ─── Descubrir sub-OUs de OU_DEPTOS ───────────────────────────
            self.stdout.write(f"Descubriendo sub-OUs en: {deptos_base}")
            ou_filter = "(objectClass=organizationalUnit)"
            sub_ous = conn.search_s(
                deptos_base, ldap.SCOPE_ONELEVEL, ou_filter, ["ou", "distinguishedName"]
            )

            if not sub_ous:
                raise CommandError(
                    f"No se encontraron sub-OUs en {deptos_base}. "
                    "Verifica LDAP_DEPTOS_OU y LDAP_BASE_DN en .env"
                )

            self.stdout.write(f"  {len(sub_ous)} sub-OUs encontradas.")

            # ─── Sincronizar usuarios de cada sub-OU ──────────────────────
            user_filter = (
                "(&(objectClass=user)(objectCategory=person)"
                "(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
            )

            for ou_dn, ou_entry in sub_ous:
                if ou_dn is None:
                    continue

                # Nombre legible de la OU (ej: "CP Iluminacion")
                ou_name_raw = ou_entry.get("ou", [b""])[0]
                if isinstance(ou_name_raw, bytes):
                    ou_name = ou_name_raw.decode("utf-8", errors="replace")
                else:
                    ou_name = str(ou_name_raw)

                if not ou_name:
                    continue

                self.stdout.write(f"\n  OU: {ou_name}")

                # Obtener o crear el Area correspondiente
                if not dry_run:
                    area, area_created = Area.objects.get_or_create(
                        nombre=ou_name,
                        defaults={
                            "ldap_ou_dn": ou_dn,
                            "descripcion": f"Area sincronizada desde AD: {ou_name}",
                        },
                    )
                    # Actualizar ldap_ou_dn si el area ya existia sin el
                    if not area_created and not area.ldap_ou_dn:
                        area.ldap_ou_dn = ou_dn
                        area.save(update_fields=["ldap_ou_dn"])
                    if area_created:
                        self.stdout.write(self.style.SUCCESS(
                            f"    [Area] Creada: {ou_name}"
                        ))
                else:
                    # En dry-run: usar area existente o simular
                    area = Area.objects.filter(nombre=ou_name).first()

                # Buscar usuarios activos en esta OU
                try:
                    users = conn.search_s(
                        ou_dn, ldap.SCOPE_ONELEVEL, user_filter, LDAP_ATTRS
                    )
                except Exception as e:
                    errores.append(f"Error buscando en {ou_dn}: {e}")
                    self.stdout.write(self.style.ERROR(f"    [!] {e}"))
                    continue

                self.stdout.write(f"    {len(users)} usuarios encontrados.")

                for dn, entry in users:
                    if dn is None:
                        continue

                    try:
                        object_guid = _get_guid(entry)
                        if not object_guid:
                            continue

                        guids_en_ad.add(object_guid)

                        sam_account = _get_attr(entry, "sAMAccountName")
                        first_name  = _get_attr(entry, "givenName", "")
                        last_name   = _get_attr(entry, "sn", "")

                        if not sam_account:
                            continue

                        # Solo sincronizamos username, first_name, last_name y area
                        # NO tocamos cargo, email, centro_costo — son datos de la app
                        defaults = {
                            "username":   sam_account,
                            "first_name": first_name,
                            "last_name":  last_name,
                            "ldap_dn":    dn,
                            "activo":     True,
                        }
                        if area:
                            defaults["area"] = area

                        if dry_run:
                            try:
                                Empleado.objects.get(ldap_object_guid=object_guid)
                                self.stdout.write(
                                    f"      [ACTUALIZAR] {first_name} {last_name} ({sam_account})"
                                )
                                actualizados += 1
                            except Empleado.DoesNotExist:
                                self.stdout.write(
                                    f"      [CREAR] {first_name} {last_name} ({sam_account})"
                                )
                                creados += 1
                        else:
                            emp, created = Empleado.objects.update_or_create(
                                ldap_object_guid=object_guid,
                                defaults=defaults,
                            )
                            if not created and not emp.activo:
                                emp.activo = True
                                emp.fecha_desactivacion = None
                                emp.save(update_fields=["activo", "fecha_desactivacion"])

                            if created:
                                creados += 1
                                self.stdout.write(self.style.SUCCESS(
                                    f"      [+] Creado: {first_name} {last_name}"
                                ))
                            else:
                                actualizados += 1
                                self.stdout.write(
                                    f"      [~] Actualizado: {first_name} {last_name}"
                                )

                    except Exception as e:
                        msg = f"Error procesando {dn}: {e}"
                        errores.append(msg)
                        self.stdout.write(self.style.ERROR(f"      [!] {msg}"))

            conn.unbind_s()

            # ─── Desactivar empleados ausentes ────────────────────────────
            if desactivar:
                empleados_activos = Empleado.objects.filter(
                    activo=True,
                    ldap_object_guid__isnull=False,
                ).exclude(ldap_object_guid="")

                for emp in empleados_activos:
                    if emp.ldap_object_guid not in guids_en_ad:
                        tiene_equipos = (
                            Computador.objects.filter(empleado_asignado=emp).exists()
                            or Celular.objects.filter(empleado_asignado=emp).exists()
                            or Monitor.objects.filter(empleado_asignado=emp).exists()
                            or Chip.objects.filter(empleado_asignado=emp).exists()
                        )

                        if tiene_equipos:
                            protegidos += 1
                            self.stdout.write(self.style.WARNING(
                                f"  [P] PROTEGIDO (tiene equipos asignados): "
                                f"{emp.get_full_name()} ({emp.username})"
                            ))
                        elif dry_run:
                            desactivados += 1
                            self.stdout.write(self.style.WARNING(
                                f"  [DESACTIVAR] {emp.get_full_name()}"
                            ))
                        else:
                            emp.activo = False
                            emp.fecha_desactivacion = date.today()
                            emp.save(update_fields=["activo", "fecha_desactivacion"])
                            desactivados += 1
                            self.stdout.write(self.style.WARNING(
                                f"  [-] Desactivado: {emp.get_full_name()}"
                            ))

        except ldap.SERVER_DOWN:
            msg = f"No se pudo conectar al servidor LDAP: {server_uri}"
            errores.append(msg)
            self.stdout.write(self.style.ERROR(msg))
        except ldap.INVALID_CREDENTIALS:
            msg = "Credenciales LDAP invalidas."
            errores.append(msg)
            self.stdout.write(self.style.ERROR(msg))
        except Exception as e:
            msg = f"Error inesperado: {e}"
            errores.append(msg)
            self.stdout.write(self.style.ERROR(msg))

        # ─── Guardar log ──────────────────────────────────────────────────
        duracion = time.time() - start_time

        if not dry_run:
            estado = "exitoso"
            if errores:
                estado = "parcial" if (creados + actualizados) > 0 else "fallido"

            from ldapsync.models import SyncLog
            SyncLog.objects.create(
                tipo_sync=tipo_sync,
                estado=estado,
                empleados_creados=creados,
                empleados_actualizados=actualizados,
                empleados_desactivados=desactivados,
                empleados_protegidos=protegidos,
                errores="\n".join(errores),
                duracion_segundos=duracion,
            )

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(f"Sincronizacion completada en {duracion:.1f}s")
        self.stdout.write(f"  Creados:      {creados}")
        self.stdout.write(f"  Actualizados: {actualizados}")
        self.stdout.write(f"  Desactivados: {desactivados}")
        self.stdout.write(f"  Protegidos:   {protegidos}")
        if errores:
            self.stdout.write(f"  Errores:      {len(errores)}")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_attr(entry, attr_name, default=""):
    """Extrae un atributo de texto de una entrada LDAP."""
    val = entry.get(attr_name, [b""])
    if isinstance(val, list) and val:
        val = val[0]
    if isinstance(val, bytes):
        val = val.decode("utf-8", errors="replace")
    return val or default


def _get_guid(entry):
    """
    Convierte objectGUID binario (16 bytes) de AD a string UUID.
    Usa bytes_le para el orden correcto de Microsoft.
    """
    raw = entry.get("objectGUID", [None])
    if isinstance(raw, list) and raw:
        raw = raw[0]
    if raw is None or not isinstance(raw, bytes) or len(raw) != 16:
        return None

    import uuid
    return str(uuid.UUID(bytes_le=raw))
