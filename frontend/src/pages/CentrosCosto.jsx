import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit, Trash2, Search, X, ChevronRight,
  Laptop, Smartphone, Monitor, Wifi, Users,
  AlertTriangle, CheckCircle2, History, RefreshCw,
} from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

const TIPOS = [
  { value: "LINEA",          label: "Línea de Transmisión" },
  { value: "SUBESTACION",    label: "Subestación" },
  { value: "ADMINISTRACION", label: "Administración" },
  { value: "OPERACION",      label: "Operación" },
  { value: "OTRO",           label: "Otro" },
];

const TIPO_BADGE = {
  LINEA:          "bg-blue-100 text-blue-800",
  SUBESTACION:    "bg-yellow-100 text-yellow-800",
  ADMINISTRACION: "bg-purple-100 text-purple-800",
  OPERACION:      "bg-green-100 text-green-800",
  OTRO:           "bg-gray-100 text-gray-700",
};

const blank = () => ({
  codigo: "", nombre: "", tipo: "ADMINISTRACION",
  area: "", activo: true, descripcion: "",
});

/**
 * Tarjeta de estadística reutilizable para el panel lateral de CC.
 * - icon: componente Lucide a mostrar
 * - label: texto descriptivo bajo el número
 * - value: número o texto a mostrar en grande
 * - color: clave del mapa de colores (blue, green, purple, orange, red, gray)
 * - warn: si es true, muestra fondo rojo para alertas (ej: equipos pendientes)
 */
function StatCard({ icon: Icon, label, value, color = "blue", warn = false }) {
  const colors = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    red:    "bg-red-50 text-red-600",
    gray:   "bg-gray-50 text-gray-500",
  };
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${warn ? "bg-red-50 border border-red-200" : "bg-white border"}`}>
      <div className={`p-2.5 rounded-lg ${colors[warn ? "red" : color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/**
 * Elemento individual del historial de movimientos de un CC.
 * Muestra la inicial del tipo de equipo, descripción, tipo de cambio, usuario y fecha.
 * Si el registro tiene diffs (cambios de campo), los despliega campo por campo.
 */
function HistorialItem({ mov }) {
  return (
    <div className="flex gap-3 py-2.5 border-b last:border-0">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-blue-600 text-xs font-bold">{mov.tipo_equipo?.[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{mov.equipo}</p>
        <p className="text-xs text-gray-500">{mov.tipo_cambio} · {mov.usuario}</p>
        {mov.cambios?.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {mov.cambios.map((c, i) => (
              <p key={i} className="text-xs text-gray-400">
                <span className="font-medium text-gray-600">{c.campo}:</span> {c.anterior} → {c.nuevo}
              </p>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 shrink-0 mt-0.5">
        {new Date(mov.fecha).toLocaleDateString("es-CL")}
      </p>
    </div>
  );
}

export default function CentrosCosto() {
  const [centros, setCentros]         = useState([]);
  const [areas, setAreas]             = useState([]);
  const [search, setSearch]           = useState("");
  const [areaFiltro, setAreaFiltro]   = useState("");
  const [tipoFiltro, setTipoFiltro]   = useState("");
  const [soloActivos, setSoloActivos] = useState(false);

  // Form modal
  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState(blank());
  const [errors, setErrors] = useState({});
  const [delId, setDelId]   = useState(null);

  // Resumen side panel
  const [selectedCC, setSelectedCC]       = useState(null);
  const [resumen, setResumen]             = useState(null);
  const [movimientos, setMovimientos]     = useState([]);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [panelTab, setPanelTab]           = useState("resumen");

  /** Carga la lista de todos los CC y áreas desde la API y actualiza el estado. */
  const fetchAll = useCallback(() => {
    api.getCentrosCosto().then((d) => setCentros(Array.isArray(d) ? d : d.results || [])).catch(() => {});
    api.getAreas().then(setAreas).catch(() => {});
  }, []);

  useEffect(fetchAll, [fetchAll]);

  /**
   * Abre el panel lateral para el CC seleccionado.
   * Lanza ambas peticiones en paralelo (resumen + movimientos) para minimizar latencia.
   * Resetea el estado de carga antes de iniciar y muestra spinner durante la espera.
   */
  const openResumen = async (cc) => {
    setSelectedCC(cc);
    setPanelTab("resumen");
    setLoadingResumen(true);
    setResumen(null);
    setMovimientos([]);
    try {
      const [res, mov] = await Promise.all([
        api.getCentroCostoResumen(cc.id),
        api.getCentroCostoMovimientos(cc.id),
      ]);
      setResumen(res);
      setMovimientos(Array.isArray(mov) ? mov : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingResumen(false);
    }
  };

  /** Abre el modal en modo creación con el formulario en blanco. */
  const openCreate = () => {
    setEditId(null); setForm(blank()); setErrors({}); setModal(true);
  };

  /**
   * Abre el modal en modo edición precargando los datos del CC seleccionado.
   * Detiene la propagación del clic para no abrir también el panel lateral.
   */
  const openEdit = (c, e) => {
    e.stopPropagation();
    setEditId(c.id);
    setForm({
      codigo: c.codigo, nombre: c.nombre, tipo: c.tipo,
      area: c.area || "", activo: c.activo, descripcion: c.descripcion || "",
    });
    setErrors({}); setModal(true);
  };

  /**
   * Envía el formulario para crear o actualizar un CC.
   * Si el área está vacía la convierte a null (FK nullable en el backend).
   * Los errores de validación del backend (400) se mapean al objeto errors para mostrarlos.
   */
  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    const data = { ...form };
    if (!data.area) data.area = null;
    try {
      editId ? await api.updateCentroCosto(editId, data) : await api.createCentroCosto(data);
      setModal(false); fetchAll();
    } catch (err) { if (err.data) setErrors(err.data); }
  };

  /**
   * Confirma y ejecuta el borrado del CC cuyo ID está en delId.
   * Después recarga la lista para reflejar el cambio.
   */
  const confirmDel = async () => {
    try { await api.deleteCentroCosto(delId); } catch (e) { console.error(e); }
    setDelId(null); fetchAll();
  };

  const centrosFiltrados = centros.filter((c) => {
    const matchSearch = !search || (
      c.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      c.nombre?.toLowerCase().includes(search.toLowerCase())
    );
    const matchArea   = !areaFiltro || String(c.area) === areaFiltro;
    const matchTipo   = !tipoFiltro || c.tipo === tipoFiltro;
    const matchActivo = !soloActivos || c.activo;
    return matchSearch && matchArea && matchTipo && matchActivo;
  });

  const activoCount = centros.filter((c) => c.activo).length;
  const alertaCount = centros.filter((c) => c.pendientes_devolucion > 0).length;

  return (
    <div className="flex gap-4 h-full">
      {/* ── COLUMNA IZQUIERDA ─────────────────────────── */}
      <div className={`flex-1 min-w-0 transition-all ${selectedCC ? "lg:max-w-[55%]" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold">Centros de Costo</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {activoCount} activos · {centros.length} total
              {alertaCount > 0 && (
                <span className="ml-2 text-red-500 font-medium">
                  · ⚠ {alertaCount} con devoluciones pendientes
                </span>
              )}
            </p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo CC
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar código o nombre…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Todas las áreas</option>
            {areas.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
          </select>
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)}
              className="rounded border-gray-300" />
            Solo activos
          </label>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">💻</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">📱</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">👥</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {centrosFiltrados.length === 0
                  ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin centros de costo</td></tr>
                  : centrosFiltrados.map((c) => (
                    <tr key={c.id}
                      onClick={() => openResumen(c)}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedCC?.id === c.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}>
                      <td className="px-4 py-3 font-mono font-semibold text-xs">{c.codigo}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {c.nombre}
                        {c.pendientes_devolucion > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-red-500 text-xs">
                            <AlertTriangle className="w-3 h-3" /> {c.pendientes_devolucion}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[c.tipo] || "bg-gray-100"}`}>
                          {c.tipo_display || c.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{c.total_computadores ?? "—"}</td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{c.total_celulares ?? "—"}</td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{c.cantidad_empleados ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => openEdit(c, e)} className="p-1 text-gray-400 hover:text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDelId(c.id); }}
                          className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 inline" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO: RESUMEN ─────────────────────── */}
      {selectedCC && (
        <div className="w-full lg:w-[45%] shrink-0 bg-white rounded-xl border flex flex-col overflow-hidden max-h-[calc(100vh-140px)] sticky top-6">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 shrink-0">
            <div className="min-w-0">
              <p className="font-mono text-xs text-gray-400">{selectedCC.codigo}</p>
              <h3 className="font-bold text-gray-900 text-sm truncate">{selectedCC.nombre}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openResumen(selectedCC)}
                className="p-1.5 text-gray-400 hover:text-blue-600" title="Recargar">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedCC(null)} className="p-1.5 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b shrink-0">
            {["resumen", "empleados", "historial"].map((tab) => (
              <button key={tab}
                onClick={() => setPanelTab(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors
                  ${panelTab === tab ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
                {tab === "resumen" ? "Resumen" : tab === "empleados" ? "Empleados" : "Historial"}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingResumen ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : !resumen ? (
              <p className="text-center text-gray-400 py-12 text-sm">Error al cargar el resumen</p>
            ) : (
              <>
                {/* TAB RESUMEN */}
                {panelTab === "resumen" && (
                  <div className="space-y-4">
                    {/* Alerta pendientes */}
                    {resumen.totales.pendientes_devolucion > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-700">
                            {resumen.totales.pendientes_devolucion} equipo{resumen.totales.pendientes_devolucion > 1 ? "s" : ""} pendiente{resumen.totales.pendientes_devolucion > 1 ? "s" : ""} de devolución
                          </p>
                          <p className="text-xs text-red-500 mt-0.5">Estos equipos requieren gestión de cierre.</p>
                        </div>
                      </div>
                    )}
                    {resumen.totales.pendientes_devolucion === 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <p className="text-sm text-green-700">Sin equipos pendientes de devolución.</p>
                      </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard icon={Laptop}     label="Computadores" value={resumen.totales.computadores} color="blue" />
                      <StatCard icon={Smartphone} label="Celulares"    value={resumen.totales.celulares}    color="green" />
                      <StatCard icon={Monitor}    label="Monitores"    value={resumen.totales.monitores}    color="purple" />
                      <StatCard icon={Wifi}       label="Chips / SIM"  value={resumen.totales.chips}        color="orange" />
                      <StatCard icon={Users}      label="Empleados"    value={resumen.totales.empleados}    color="gray" />
                      <StatCard icon={AlertTriangle} label="Pend. devolución"
                        value={resumen.totales.pendientes_devolucion}
                        warn={resumen.totales.pendientes_devolucion > 0} />
                    </div>

                    {/* Estados computadores */}
                    {Object.keys(resumen.computadores_por_estado || {}).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Estado computadores</p>
                        <div className="space-y-1">
                          {Object.entries(resumen.computadores_por_estado).map(([estado, count]) => (
                            <div key={estado} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{estado.replace(/_/g, " ")}</span>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Equipos pendientes lista */}
                    {resumen.equipos_pendientes?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                          Equipos a devolver
                        </p>
                        <div className="space-y-1.5">
                          {resumen.equipos_pendientes.map((eq, i) => (
                            <div key={i} className="bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-medium text-gray-700">{eq.tipo}</span>
                                <span className="text-gray-500 ml-1">{eq.numero_inventario}</span>
                              </div>
                              <span className="text-gray-500">{eq.asignado_a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB EMPLEADOS */}
                {panelTab === "empleados" && (
                  <div className="space-y-2">
                    {resumen.empleados_lista?.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Sin empleados activos en este CC</p>
                    ) : resumen.empleados_lista.map((emp) => (
                      <div key={emp.id} className="border rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-800">{emp.nombre}</p>
                        <p className="text-xs text-gray-500">{emp.cargo || "Sin cargo"}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>💻 {emp.computadores}</span>
                          <span>📱 {emp.celulares}</span>
                          <span>📶 {emp.chips}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB HISTORIAL */}
                {panelTab === "historial" && (
                  <div>
                    {movimientos.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos registrados</p>
                    ) : movimientos.map((mov) => (
                      <HistorialItem key={mov.id} mov={mov} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? "Editar Centro de Costo" : "Nuevo Centro de Costo"}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input type="text" required value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: CC-001" />
              {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" required value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select required value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
              <select value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">Sin asignar</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas</label>
            <textarea value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="rounded border-gray-300" />
            Centro de costo activo
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              {editId ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Eliminar este centro de costo? Los empleados y equipos asociados quedarán sin CC asignado.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={confirmDel} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>
    </div>
  );
}
