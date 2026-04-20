import React, { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Search, Download, Pen, ShieldCheck, XCircle, Eye, Mail } from "lucide-react";
import api, { downloadBlob } from "../api";
import Modal from "../components/Modal";

const estadoColor = {
  borrador: "bg-gray-100 text-gray-800",
  pendiente_firma: "bg-yellow-100 text-yellow-800",
  firmada: "bg-green-100 text-green-800",
  anulada: "bg-red-100 text-red-800",
};

export default function Actas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showDetail, setShowDetail]   = useState(null);
  const [showFirma, setShowFirma]     = useState(null);
  const [showEmail, setShowEmail]     = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterEstado) params.set("estado", filterEstado);
      const data = await api.getActas(params.toString());
      setItems(data.results || data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function descargarPdf(acta) {
    try {
      const blob = await api.descargarPdfActa(acta.id);
      downloadBlob(blob, `${acta.numero_acta}.pdf`);
    } catch (e) {
      alert("Error al descargar PDF. El acta podria no tener PDF generado aun.");
    }
  }

  async function anular(acta) {
    if (!confirm(`Anular el acta ${acta.numero_acta}?`)) return;
    try {
      await api.anularActa(acta.id);
      load();
    } catch (e) { alert("Error al anular"); }
  }

  async function regenerarPdf(acta) {
    try {
      await api.regenerarPdfActa(acta.id);
      alert("PDF regenerado exitosamente.");
      load();
    } catch (e) { alert("Error al regenerar PDF"); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Actas de Entrega</h2>
        </div>
        <p className="text-sm text-gray-500">Las actas se generan automaticamente al asignar equipos</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Buscar por numero de acta o empleado..." className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setTimeout(load, 0); }}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="pendiente_firma">Pendiente de Firma</option>
          <option value="firmada">Firmada</option>
          <option value="anulada">Anulada</option>
        </select>
      </div>

      {/* Lista de actas */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No hay actas de entrega. Se generaran automaticamente al asignar un equipo a un empleado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-3 text-left">N.º Acta</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Tipo</th>
                <th className="px-3 py-3 text-left">Empleado</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Equipo</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Fecha</th>
                <th className="px-3 py-3 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(acta => (
                <tr key={acta.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs font-semibold whitespace-nowrap">
                    {acta.numero_acta}
                  </td>
                  <td className="px-3 py-3 text-xs hidden sm:table-cell whitespace-nowrap">
                    {acta.tipo_acta_display}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-sm leading-tight">{acta.empleado_nombre}</div>
                    <div className="text-xs text-gray-400">{acta.empleado_area}</div>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <div className="text-xs font-medium">{acta.equipo_tipo}</div>
                    <div className="text-xs text-gray-400">{acta.detalle_equipo?.numero_serie || acta.detalle_equipo?.numero_inventario || ""}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${estadoColor[acta.estado]}`}>
                      {acta.estado_display}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">
                    {new Date(acta.fecha_creacion).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-3 py-3">
                    {/* Botones principales siempre visibles */}
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => setShowDetail(acta)}
                        className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50" title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => descargarPdf(acta)}
                        className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50" title="Descargar PDF">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowEmail(acta)}
                        className="p-1.5 rounded text-gray-500 hover:text-purple-600 hover:bg-purple-50" title="Enviar por email">
                        <Mail className="w-4 h-4" />
                      </button>
                      {acta.estado === "pendiente_firma" && (
                        <button onClick={() => setShowFirma(acta)}
                          className="p-1.5 rounded text-gray-500 hover:text-green-600 hover:bg-green-50" title="Firmar">
                          <Pen className="w-4 h-4" />
                        </button>
                      )}
                      {acta.estado !== "anulada" && acta.estado !== "firmada" && (
                        <button onClick={() => anular(acta)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50" title="Anular">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalle */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`Acta ${showDetail?.numero_acta}`} wide>
        {showDetail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Tipo:</strong> {showDetail.tipo_acta_display}</div>
              <div><strong>Estado:</strong> {showDetail.estado_display}</div>
              <div><strong>Empleado:</strong> {showDetail.empleado_nombre}</div>
              <div><strong>Cargo:</strong> {showDetail.empleado_cargo}</div>
              <div><strong>Area:</strong> {showDetail.empleado_area}</div>
              <div><strong>Responsable TI:</strong> {showDetail.responsable_nombre || "No asignado"}</div>
              <div><strong>Fecha creacion:</strong> {new Date(showDetail.fecha_creacion).toLocaleString("es-CO")}</div>
              {showDetail.fecha_firma && <div><strong>Fecha firma:</strong> {new Date(showDetail.fecha_firma).toLocaleString("es-CO")}</div>}
            </div>
            {showDetail.detalle_equipo && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <h4 className="font-medium mb-2">Detalle del equipo al momento de la entrega</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(showDetail.detalle_equipo).map(([k, v]) => (
                    <div key={k}><strong>{k}:</strong> {v}</div>
                  ))}
                </div>
              </div>
            )}
            {showDetail.observaciones && <div><strong>Observaciones:</strong><br />{showDetail.observaciones}</div>}
            {showDetail.accesorios && <div><strong>Accesorios:</strong><br />{showDetail.accesorios}</div>}
            {showDetail.condiciones_uso && <div><strong>Condiciones de uso:</strong><br />{showDetail.condiciones_uso}</div>}
            {showDetail.tiene_firma_digital && (
              <div className="border rounded-lg p-3 bg-blue-50">
                <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4 text-blue-600" /><strong>Firma Digital Certificada</strong></div>
                <p className="text-xs">Valida: {showDetail.firma_digital_valida ? "Si" : "No"}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => descargarPdf(showDetail)} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
              <button onClick={() => { setShowEmail(showDetail); setShowDetail(null); }}
                className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                <Mail className="w-4 h-4" /> Enviar por Email
              </button>
              <button onClick={() => { regenerarPdf(showDetail); setShowDetail(null); }} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Regenerar PDF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de firma */}
      <FirmaModal acta={showFirma} onClose={() => setShowFirma(null)} onSaved={() => { setShowFirma(null); load(); }} />

      {/* Modal de envío por email */}
      <EmailModal acta={showEmail} onClose={() => setShowEmail(null)} />
    </div>
  );
}


// ─── EmailModal ───────────────────────────────────────────────────────────────

function EmailModal({ acta, onClose }) {
  const [emailDest, setEmailDest] = useState("");
  const [mensaje, setMensaje]     = useState("");
  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState(null);   // { ok, mensaje } | { error }

  // Pre-rellenar email del empleado si existe
  useEffect(() => {
    if (acta) {
      setEmailDest(acta.empleado_email || "");
      setMensaje("");
      setResult(null);
    }
  }, [acta]);

  async function send(e) {
    e.preventDefault();
    setSending(true); setResult(null);
    try {
      const resp = await api.enviarActaEmail(acta.id, {
        email_destino: emailDest || undefined,
        mensaje_extra: mensaje  || undefined,
      });
      setResult({ ok: true, mensaje: resp.mensaje });
    } catch (err) {
      const errMsg = err.data?.error || err.data?.detail || "Error al enviar el correo.";
      setResult({ ok: false, mensaje: errMsg });
    }
    setSending(false);
  }

  if (!acta) return null;

  return (
    <Modal open={!!acta} onClose={onClose} title={`Enviar Acta ${acta.numero_acta} por Email`}>
      {result ? (
        <div className="space-y-4">
          <div className={`rounded-lg p-4 ${result.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className={`text-sm font-medium ${result.ok ? "text-green-800" : "text-red-800"}`}>
              {result.ok ? "✓ " : "✗ "}{result.mensaje}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            {!result.ok && (
              <button onClick={() => setResult(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Reintentar
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <p className="text-sm text-gray-600">
            Se enviará el PDF del acta como adjunto al correo indicado.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email destinatario *
            </label>
            <input
              type="email"
              required
              value={emailDest}
              onChange={(e) => setEmailDest(e.target.value)}
              placeholder="nombre@empresa.com"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
            {!acta.empleado_email && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Este empleado no tiene email registrado — ingresa uno manualmente o
                agrégalo en la ficha del empleado.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nota adicional <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Mensaje adicional que se incluirá en el cuerpo del correo…"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={sending}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              <Mail className="w-4 h-4" />
              {sending ? "Enviando…" : "Enviar Acta"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}


// ─── FirmaModal ───────────────────────────────────────────────────────────────

function FirmaModal({ acta, onClose, onSaved }) {
  const canvasRefEmp = useRef(null);
  const canvasRefResp = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState("empleado");

  const getCanvas = () => activeCanvas === "empleado" ? canvasRefEmp.current : canvasRefResp.current;

  const startDraw = useCallback((e) => {
    const canvas = getCanvas();
    if (!canvas) return;
    setDrawing(true);
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [activeCanvas]);

  const draw = useCallback((e) => {
    if (!drawing) return;
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [drawing, activeCanvas]);

  const endDraw = () => setDrawing(false);

  function clearCanvas(ref) {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {};
      if (canvasRefEmp.current) {
        payload.firma_empleado_imagen = canvasRefEmp.current.toDataURL("image/png");
      }
      if (canvasRefResp.current) {
        payload.firma_responsable_imagen = canvasRefResp.current.toDataURL("image/png");
      }
      await api.firmarActa(acta.id, payload);
      onSaved();
    } catch (e) {
      alert("Error al firmar: " + JSON.stringify(e.data || e));
    }
    setSaving(false);
  }

  if (!acta) return null;

  return (
    <Modal open={!!acta} onClose={onClose} title={`Firmar Acta ${acta.numero_acta}`} wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Dibuje las firmas en los recuadros. Ambas firmas son necesarias para completar el acta.</p>

        <div className="flex gap-2 mb-2">
          <button onClick={() => setActiveCanvas("empleado")}
            className={`px-3 py-1 text-sm rounded-lg ${activeCanvas === "empleado" ? "bg-blue-600 text-white" : "border"}`}>
            Firma Empleado
          </button>
          <button onClick={() => setActiveCanvas("responsable")}
            className={`px-3 py-1 text-sm rounded-lg ${activeCanvas === "responsable" ? "bg-blue-600 text-white" : "border"}`}>
            Firma Responsable TI
          </button>
        </div>

        <div className={activeCanvas === "empleado" ? "" : "hidden"}>
          <label className="text-sm font-medium">Firma del empleado: {acta.empleado_nombre}</label>
          <canvas ref={canvasRefEmp} width={500} height={200}
            className="border rounded-lg mt-1 cursor-crosshair bg-white w-full"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          <button onClick={() => clearCanvas(canvasRefEmp)} className="text-xs text-red-600 mt-1">Limpiar firma</button>
        </div>

        <div className={activeCanvas === "responsable" ? "" : "hidden"}>
          <label className="text-sm font-medium">Firma del responsable TI</label>
          <canvas ref={canvasRefResp} width={500} height={200}
            className="border rounded-lg mt-1 cursor-crosshair bg-white w-full"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          <button onClick={() => clearCanvas(canvasRefResp)} className="text-xs text-red-600 mt-1">Limpiar firma</button>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {saving ? "Firmando..." : "Aplicar Firmas"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
