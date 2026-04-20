"""
Vistas de la API para las Actas de Entrega.
"""

from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import ActaEntrega, EstadoActa
from .serializers import (
    ActaEntregaReadSerializer,
    ActaEntregaWriteSerializer,
    FirmaActaSerializer,
    FirmaDigitalSerializer,
)
from .pdf_generator import generar_pdf_acta, generar_pdf_acta_response


class ActaEntregaViewSet(viewsets.ModelViewSet):
    """
    CRUD de actas de entrega.
    Las actas se generan automaticamente via signal, pero tambien
    se pueden crear manualmente desde esta API.
    """
    queryset = ActaEntrega.objects.select_related(
        "content_type", "empleado", "empleado__area", "responsable_ti",
    ).all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["estado", "tipo_acta", "empleado", "content_type"]
    search_fields = ["numero_acta", "empleado__first_name", "empleado__last_name", "observaciones"]
    ordering_fields = ["fecha_creacion", "fecha_firma", "numero_acta"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return ActaEntregaReadSerializer
        return ActaEntregaWriteSerializer

    @action(detail=True, methods=["post"], url_path="firmar")
    def firmar(self, request, pk=None):
        """
        Aplica la firma simple (imagenes base64) al acta.
        Recibe firma_empleado_imagen y/o firma_responsable_imagen.
        """
        acta = self.get_object()

        if acta.estado == EstadoActa.FIRMADA:
            return Response(
                {"error": "El acta ya esta firmada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if acta.estado == EstadoActa.ANULADA:
            return Response(
                {"error": "No se puede firmar un acta anulada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FirmaActaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get("firma_empleado_imagen"):
            acta.firma_empleado_imagen = serializer.validated_data["firma_empleado_imagen"]
        if serializer.validated_data.get("firma_responsable_imagen"):
            acta.firma_responsable_imagen = serializer.validated_data["firma_responsable_imagen"]

        # Si ambas firmas estan presentes, marcar como firmada
        if acta.firma_empleado_imagen and acta.firma_responsable_imagen:
            acta.estado = EstadoActa.FIRMADA
            acta.fecha_firma = timezone.now()

        acta.save()

        # Regenerar el PDF con las firmas incluidas
        try:
            generar_pdf_acta(acta)
        except Exception:
            pass

        return Response(
            ActaEntregaReadSerializer(acta, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="firma-digital")
    def firma_digital(self, request, pk=None):
        """
        Aplica una firma digital certificada al acta.
        Recibe hash, serial del certificado y timestamp.
        """
        acta = self.get_object()

        if acta.estado == EstadoActa.FIRMADA:
            return Response(
                {"error": "El acta ya esta firmada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FirmaDigitalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        acta.firma_digital_hash = serializer.validated_data["firma_digital_hash"]
        acta.certificado_serial = serializer.validated_data["certificado_serial"]
        acta.firma_digital_timestamp = serializer.validated_data["firma_digital_timestamp"]
        acta.firma_digital_valida = True
        acta.estado = EstadoActa.FIRMADA
        acta.fecha_firma = timezone.now()
        acta.save()

        # Regenerar PDF con info de firma digital
        try:
            generar_pdf_acta(acta)
        except Exception:
            pass

        return Response(
            ActaEntregaReadSerializer(acta, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="anular")
    def anular(self, request, pk=None):
        """Anula un acta de entrega."""
        acta = self.get_object()
        if acta.estado == EstadoActa.ANULADA:
            return Response(
                {"error": "El acta ya esta anulada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        acta.estado = EstadoActa.ANULADA
        acta.save()
        return Response(
            ActaEntregaReadSerializer(acta, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], url_path="descargar-pdf")
    def descargar_pdf(self, request, pk=None):
        """Descarga el PDF del acta."""
        acta = self.get_object()
        return generar_pdf_acta_response(acta)

    @action(detail=True, methods=["post"], url_path="regenerar-pdf")
    def regenerar_pdf(self, request, pk=None):
        """Regenera el PDF del acta."""
        acta = self.get_object()
        try:
            generar_pdf_acta(acta)
            acta.refresh_from_db()
            return Response(
                ActaEntregaReadSerializer(acta, context={"request": request}).data
            )
        except Exception as e:
            return Response(
                {"error": f"Error al regenerar PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], url_path="enviar-email")
    def enviar_email(self, request, pk=None):
        """
        Envia el PDF del acta al email del empleado (o a una direccion adicional).
        Requiere EMAIL_BACKEND configurado en settings (SMTP Gmail).

        Body (JSON, todos opcionales):
          - email_destino: str  — Si se omite, usa el email del empleado
          - mensaje_extra: str  — Texto adicional en el cuerpo del correo
        """
        acta = self.get_object()

        # ── Determinar destinatario ──────────────────────────────────────
        email_destino = request.data.get("email_destino", "").strip()
        if not email_destino:
            emp = acta.empleado
            if emp and emp.email:
                email_destino = emp.email
            else:
                return Response(
                    {
                        "error": "No hay email configurado para este empleado. "
                                 "Ingresa un email_destino o configura el email del empleado.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        mensaje_extra = request.data.get("mensaje_extra", "").strip()

        # ── Asegurar que el PDF existe ───────────────────────────────────
        if not acta.archivo_pdf:
            try:
                generar_pdf_acta(acta)
                acta.refresh_from_db()
            except Exception as e:
                return Response(
                    {"error": f"No se pudo generar el PDF: {e}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # ── Construir y enviar el correo ─────────────────────────────────
        from django.core.mail import EmailMessage
        from django.conf import settings as djsettings

        emp_nombre = acta.empleado.get_full_name() if acta.empleado else "Colaborador/a"
        tipo_acta_label = acta.get_tipo_acta_display() if hasattr(acta, "get_tipo_acta_display") else acta.tipo_acta
        numero_equipo = ""
        if acta.detalle_equipo:
            numero_equipo = (
                acta.detalle_equipo.get("numero_inventario")
                or acta.detalle_equipo.get("numero_serie")
                or acta.detalle_equipo.get("numero_linea")
                or ""
            )

        asunto = f"Acta de {tipo_acta_label} — {acta.numero_acta}"

        cuerpo = f"""Estimado/a {emp_nombre},

Se adjunta el acta de {tipo_acta_label.lower()} correspondiente al equipo \
{numero_equipo or 'registrado en el sistema'} (N.º {acta.numero_acta}).

{f'Nota: {mensaje_extra}' if mensaje_extra else ''}

Por favor revisa el documento adjunto y contacta al área de TI si tienes alguna consulta.

Atentamente,
Departamento de Tecnología
Elecnor Chile
"""

        try:
            email = EmailMessage(
                subject=asunto,
                body=cuerpo.strip(),
                from_email=djsettings.DEFAULT_FROM_EMAIL,
                to=[email_destino],
            )
            # Adjuntar el PDF
            email.attach(
                f"acta_{acta.numero_acta}.pdf",
                acta.archivo_pdf.read(),
                "application/pdf",
            )
            email.send(fail_silently=False)
        except Exception as e:
            return Response(
                {"error": f"Error al enviar el correo: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            "ok": True,
            "mensaje": f"Acta enviada correctamente a {email_destino}.",
            "destinatario": email_destino,
        })

    @action(
        detail=False, methods=["get"],
        url_path="por-equipo/(?P<tipo>computador|celular|monitor|chip)/(?P<equipo_id>[0-9]+)",
    )
    def por_equipo(self, request, tipo=None, equipo_id=None):
        """Lista las actas de un equipo especifico."""
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get(app_label="inventory", model=tipo)
        qs = self.get_queryset().filter(content_type=ct, object_id=equipo_id)
        serializer = ActaEntregaReadSerializer(
            qs, many=True, context={"request": request}
        )
        return Response(serializer.data)
