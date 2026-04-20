import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Mail, CheckCircle, Clock, XCircle,
  Send, FileSpreadsheet, ChevronDown, Filter
} from "lucide-react";
import Modal from "../components/Modal";
import api, { downloadBlob } from "../api";

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPOS = [
  { value: "ALTA", label: "Alta (crear correo)" },
  { value: "BAJA", label: "Baja (eliminar correo)" },
];

const ESTADOS = [
  { value: "PENDIENTE",   label: "Pendiente" },
  { value: "ENVIADO_CAU", label: "Enviado a CAU" },
  { value: "COMPLETADO",  label: "Completado" },
  { value: "RECHAZADO",   label: "Rechazado" },
];

const BADGE = {
  PENDIENTE:   "bg-yellow-100 text-yellow-800 border border-yellow-300",
  ENVIADO_CAU: "bg-blue-100   text-blue-800   border border-blue-300",
  COMPLETADO:  "bg-green-100  text-green-800  border border-green-300",
  RECHAZADO:   "bg-red-100    text-red-800    border border-red-300",
};

const BADGE_TIPO = {
  ALTA: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  BAJA: "bg-rose-100    text-rose-800    border border-rose-300",
};

const ICONOS_ESTADO = {
  PENDIENTE:   <Clock   size={14} className="inline mr-1" />,
  ENVIADO_CAU: <Send    size={14} className="inline mr-1" />,
  COMPLETADO:  <CheckCircle size={14} className="inline mr-1" />,
  RECHAZADO:   <XCircle size={14} className="inline mr-1" />,
};

const emptyForm = () => ({
  tipo: "ALTA",
  empleado_nombre: "",
  empleado_rut: "",
  empleado_cargo: "",
  centro_costo: "",
  fecha_requerida: "",
  numero_ticket_cau: "",
  link_solicitud_cau: "",
  observaciones: "",
});

// ─── Componente de tarjeta estadística ───────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-4 flex items-center gap-4`}>
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SolicitudesCorreo() {
  const [solicitudes, setSolicitudes]   = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [resumen, setResumen]           = useState({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filtroTipo, setFiltroTipo]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Modal formulario
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm());
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);

  // Modal cambio de estado
  const [showEstadoModal, setShowEstadoModal]   = useState(false);
  const [solicitudEstado, setSolicitudEstado]   = useState(null);
  const [nuevoEstado, setNuevoEstado]           = useState("");
  const [ticketInput, setTicketInput]           = useState("");
  const [savingEstado, setSavingEstado]         = useState(false);

  // ── Carga de datos ───────────────────────────────────────────────────────

  /**
   * Carga solicitudes, centros de costo y resumen de contadores en paralelo.
   */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo)   params.append("tipo",   filtroTipo);
      if (filtroEstado) params.append("estado", filtroEstado);
      if (search)       params.append("search", search);

      const [solRes, ccRes, resRes] = await Promise.all([
        api.get(`/solicitudes-correo/?${params}`),
        api.get("/centros-costo/?activo=true"),
        api.get("/solicitudes-correo/resumen/"),
      ]);
      setSolicitudes(solRes.results ?? solRes);
      setCentrosCosto(ccRes.results ?? ccRes);
      setResumen(resRes);
    } catch (e) {
      console.error("Error cargando solicitudes:", e);
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, filtroEstado, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Formulario ───────────────────────────────────────────────────────────

  /**
   * Abre el modal para crear una nueva solicitud.
   */
  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setShowModal(true);
  }

  /**
   * Abre el modal para editar una solicitud existente.
   * Solo permite editar datos básicos y el ticket CAU.
   */
  function openEdit(s) {
    setEditing(s);
    setForm({
      tipo:               s.tipo,
      empleado_nombre:    s.empleado_nombre,
      empleado_rut:       s.empleado_rut,
      empleado_cargo:     s.empleado_cargo,
      centro_costo:       s.centro_costo,
      fecha_requerida:    s.fecha_requerida,
      numero_ticket_cau:  s.numero_ticket_cau  || "",
      link_solicitud_cau: s.link_solicitud_cau || "",
      observaciones:      s.observaciones      || "",
    });
    setErrors({});
    setShowModal(true);
  }

  /**
   * Envía el formulario al backend.
   * En creación, el backend dispara automáticamente el email de notificación.
   */
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      ...form,
      centro_costo: form.centro_costo || null,
    };
    try {
      if (editing) {
        await api.patch(`/solicitudes-correo/${editing.id}/`, payload);
      } else {
        await api.post("/solicitudes-correo/", payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      if (err.data) setErrors(err.data);
    } finally {
      setSaving(false);
    }
  }

  // ── Cambio de estado ─────────────────────────────────────────────────────

  /**
   * Abre el modal de cambio de estado para una solicitud.
   * Pre-selecciona el siguiente estado lógico según el estado actual.
   */
  function openCambioEstado(s) {
    setSolicitudEstado(s);
    setTicketInput(s.numero_ticket_cau || "");
    const siguientes = {
      PENDIENTE:   "ENVIADO_CAU",
      ENVIADO_CAU: "COMPLETADO",
    };
    setNuevoEstado(siguientes[s.estado] || "RECHAZADO");
    setShowEstadoModal(true);
  }

  /**
   * Envía el cambio de estado al endpoint /cambiar_estado/.
   */
  async function confirmarCambioEstado() {
    if (!solicitudEstado || !nuevoEstado) return;
    setSavingEstado(true);
    try {
      await api.post(`/solicitudes-correo/${solicitudEstado.id}/cambiar_estado/`, {
        estado: nuevoEstado,
        numero_ticket_cau: ticketInput,
      });
      setShowEstadoModal(false);
      fetchAll();
    } catch (err) {
      alert(err.data?.error || "Error al cambiar estado");
    } finally {
      setSavingEstado(false);
    }
  }

  // ── Exportar ─────────────────────────────────────────────────────────────

  /**
   * Descarga un Excel con todas las solicitudes del filtro activo.
   */
  async function exportarExcel() {
    const params = new URLSearchParams();
    if (filtroTipo)   params.append("tipo",   filtroTipo);
    if (filtroEstado) params.append("estado", filtroEstado);
    if (search)       params.append("search", search);
    const blob = await api.get(`/solicitudes-correo/exportar_excel/?${params}`);
    downloadBlob(blob, "solicitudes_correo.xlsx");
  }

  // ── Helpers de UI ────────────────────────────────────────────────────────

  /**
   * Retorna el label del siguiente estado posible para mostrar en el botón de acción.
   */
  function labelAccion(estado) {
    if (estado === "PENDIENTE")   return "Marcar Enviado a CAU";
    if (estado === "ENVIADO_CAU") return "Marcar Completado";
    return null;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Mail size={26} className="text-blue-600" />
            Solicitudes de Correo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Alta y baja de cuentas de correo corporativo — Flujo con CAU España
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus size={18} /> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock size={24}/>}        label="Pendientes"     value={resumen.PENDIENTE   ?? 0} color="border-yellow-400" />
        <StatCard icon={<Send size={24}/>}          label="Enviadas a CAU" value={resumen.ENVIADO_CAU ?? 0} color="border-blue-400"   />
        <StatCard icon={<CheckCircle size={24}/>}   label="Completadas"    value={resumen.COMPLETADO  ?? 0} color="border-green-400"  />
        <StatCard icon={<XCircle size={24}/>}       label="Rechazadas"     value={resumen.RECHAZADO   ?? 0} color="border-red-400"    />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT o ticket..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando solicitudes...</div>
        ) : solicitudes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Mail size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay solicitudes con los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Empleado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cargo / CC</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha req.</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ticket CAU</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Registrado por</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitudes.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_TIPO[s.tipo]}`}>
                      {s.tipo_label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{s.empleado_nombre}</p>
                    <p className="text-gray-400 text-xs">{s.empleado_rut}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{s.empleado_cargo}</p>
                    <p className="text-gray-400 text-xs truncate max-w-[180px]">{s.centro_costo_nombre}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.fecha_requerida
                      ? new Date(s.fecha_requerida + "T00:00:00").toLocaleDateString("es-CL")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {s.numero_ticket_cau
                        ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded w-fit">{s.numero_ticket_cau}</span>
                        : <span className="text-gray-300 text-xs">Sin ticket</span>}
                      {s.link_solicitud_cau && (
                        <a
                          href={s.link_solicitud_cau}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Send size={11} /> Ver en CAU
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[s.estado]}`}>
                      {ICONOS_ESTADO[s.estado]}
                      {s.estado_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.solicitante_nombre}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {labelAccion(s.estado) && (
                        <button
                          onClick={() => openCambioEstado(s)}
                          className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium"
                        >
                          {labelAccion(s.estado)}
                        </button>
                      )}
                      {s.estado === "PENDIENTE" && (
                        <button
                          onClick={() => { setSolicitudEstado(s); setNuevoEstado("RECHAZADO"); setTicketInput(""); setShowEstadoModal(true); }}
                          className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                        >
                          Rechazar
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(s)}
                        className="px-2.5 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Crear / Editar solicitud ── */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 className="text-lg font-bold text-gray-800 mb-5">
            {editing ? "Editar Solicitud" : "Nueva Solicitud de Correo"}
          </h2>
          <form onSubmit={submit} className="space-y-4">

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de solicitud *</label>
              <div className="flex gap-3">
                {TIPOS.map(t => (
                  <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value={t.value}
                      checked={form.tipo === t.value}
                      onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                      className="text-blue-600"
                    />
                    <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${BADGE_TIPO[t.value]}`}>
                      {t.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Nombre y RUT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  value={form.empleado_nombre}
                  onChange={e => setForm(f => ({ ...f, empleado_nombre: e.target.value }))}
                  placeholder="Juan Pérez González"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                {errors.empleado_nombre && <p className="text-red-500 text-xs mt-1">{errors.empleado_nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT *</label>
                <input
                  value={form.empleado_rut}
                  onChange={e => setForm(f => ({ ...f, empleado_rut: e.target.value }))}
                  placeholder="12.345.678-9"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                {errors.empleado_rut && <p className="text-red-500 text-xs mt-1">{errors.empleado_rut}</p>}
              </div>
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
              <input
                value={form.empleado_cargo}
                onChange={e => setForm(f => ({ ...f, empleado_cargo: e.target.value }))}
                placeholder="Jefe de Obra"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              {errors.empleado_cargo && <p className="text-red-500 text-xs mt-1">{errors.empleado_cargo}</p>}
            </div>

            {/* Centro de Costo y Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Centro de Costo *</label>
                <select
                  value={form.centro_costo}
                  onChange={e => setForm(f => ({ ...f, centro_costo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">— Seleccionar —</option>
                  {centrosCosto.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.codigo} — {cc.nombre}</option>
                  ))}
                </select>
                {errors.centro_costo && <p className="text-red-500 text-xs mt-1">{errors.centro_costo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.tipo === "ALTA" ? "Fecha de ingreso *" : "Fecha de baja *"}
                </label>
                <input
                  type="date"
                  value={form.fecha_requerida}
                  onChange={e => setForm(f => ({ ...f, fecha_requerida: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                {errors.fecha_requerida && <p className="text-red-500 text-xs mt-1">{errors.fecha_requerida}</p>}
              </div>
            </div>

            {/* Ticket CAU + Link (solo visible al editar) */}
            {editing && (
              <div className="space-y-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Gestión CAU</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Ticket CAU</label>
                    <input
                      value={form.numero_ticket_cau}
                      onChange={e => setForm(f => ({ ...f, numero_ticket_cau: e.target.value }))}
                      placeholder="INC-2024-00123"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link solicitud CAU</label>
                    <input
                      type="url"
                      value={form.link_solicitud_cau}
                      onChange={e => setForm(f => ({ ...f, link_solicitud_cau: e.target.value }))}
                      placeholder="https://cau.elecnor.es/ticket/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  Pega aquí el N° de ticket y la URL directa al ticket en el portal CAU de España.
                </p>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                rows={3}
                placeholder="Información adicional relevante para la solicitud..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {!editing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                Al guardar se enviará una notificación automática al equipo de TI por correo.
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear solicitud"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Cambio de estado ── */}
      {showEstadoModal && solicitudEstado && (
        <Modal onClose={() => setShowEstadoModal(false)}>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Actualizar estado</h2>
          <p className="text-sm text-gray-500 mb-5">
            Solicitud de <strong>{solicitudEstado.tipo_label}</strong> para{" "}
            <strong>{solicitudEstado.empleado_nombre}</strong>
          </p>

          <div className="space-y-4">
            {/* Selector de nuevo estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo estado</label>
              <div className="flex flex-col gap-2">
                {ESTADOS.filter(e => {
                  const opts = {
                    PENDIENTE:   ["ENVIADO_CAU", "RECHAZADO"],
                    ENVIADO_CAU: ["COMPLETADO",  "RECHAZADO"],
                  };
                  return (opts[solicitudEstado.estado] || []).includes(e.value);
                }).map(e => (
                  <label key={e.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border hover:bg-gray-50">
                    <input
                      type="radio"
                      name="nuevoEstado"
                      value={e.value}
                      checked={nuevoEstado === e.value}
                      onChange={() => setNuevoEstado(e.value)}
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[e.value]}`}>
                      {ICONOS_ESTADO[e.value]}{e.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ticket CAU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Ticket CAU
                {nuevoEstado === "ENVIADO_CAU" && <span className="text-red-500"> *</span>}
              </label>
              <input
                value={ticketInput}
                onChange={e => setTicketInput(e.target.value)}
                placeholder="Ej: INC-2024-00123"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              {nuevoEstado === "ENVIADO_CAU" && (
                <p className="text-xs text-gray-500 mt-1">
                  Registra el número de ticket asignado por el CAU de España.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEstadoModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioEstado}
                disabled={savingEstado || !nuevoEstado}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {savingEstado ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
