import React, { useState, useEffect } from "react";
import { Wrench, Plus, Search, ChevronDown, ChevronUp, DollarSign, FileText, Upload } from "lucide-react";
import api from "../api";
import Modal from "../components/Modal";

const TIPO_CHOICES = [
  { value: "preventivo", label: "Preventivo" },
  { value: "correctivo", label: "Correctivo" },
];
const ESTADO_CHOICES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En Proceso" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

const estadoColor = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  cancelado: "bg-gray-100 text-gray-800",
};

export default function Mantenimiento() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [costos, setCostos] = useState(null);

  // Catalogos para selects
  const [rams, setRams] = useState([]);
  const [almacenamientos, setAlmacenamientos] = useState([]);
  const [procesadores, setProcesadores] = useState([]);
  const [computadores, setComputadores] = useState([]);
  const [celulares, setCelulares] = useState([]);
  const [monitores, setMonitores] = useState([]);

  const blankForm = {
    equipo_tipo: "computador", equipo_id: "", tipo: "correctivo",
    estado: "pendiente", descripcion: "", diagnostico: "",
    componentes_cambiados: "", actualizar_specs: false,
    nueva_ram: "", nuevo_almacenamiento: "", nuevo_procesador: "",
    costo_repuestos: 0, costo_mano_obra: 0,
    proveedor_externo: "", notas: "",
    fecha_inicio: "", fecha_fin: "",
  };
  const [form, setForm] = useState(blankForm);

  useEffect(() => { load(); loadCatalogos(); }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterTipo) params.set("tipo", filterTipo);
      if (filterEstado) params.set("estado", filterEstado);
      const data = await api.getMantenimientos(params.toString());
      setItems(data.results || data);
      const c = await api.resumenCostos();
      setCostos(c);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadCatalogos() {
    try {
      const [r, a, p, comp, c, m] = await Promise.all([
        api.getRam(), api.getAlmacenamientos(), api.getProcesadores(),
        api.getComputadores(), api.getCelulares(), api.getMonitores(),
      ]);
      setRams(r); setAlmacenamientos(a); setProcesadores(p);
      setComputadores(comp.results || comp); setCelulares(c.results || c); setMonitores(m.results || m);
    } catch (e) { console.error(e); }
  }

  function openNew() { setEditing(null); setForm(blankForm); setShowModal(true); }
  function openEdit(item) {
    setEditing(item);
    setForm({
      equipo_tipo: item.equipo_tipo?.toLowerCase() || "computador",
      equipo_id: item.object_id || "",
      tipo: item.tipo, estado: item.estado,
      descripcion: item.descripcion, diagnostico: item.diagnostico || "",
      componentes_cambiados: item.componentes_cambiados || "",
      actualizar_specs: item.actualizar_specs || false,
      nueva_ram: item.nueva_ram || "", nuevo_almacenamiento: item.nuevo_almacenamiento || "",
      nuevo_procesador: item.nuevo_procesador || "",
      costo_repuestos: item.costo_repuestos || 0,
      costo_mano_obra: item.costo_mano_obra || 0,
      proveedor_externo: item.proveedor_externo || "",
      notas: item.notas || "",
      fecha_inicio: item.fecha_inicio ? item.fecha_inicio.slice(0, 16) : "",
      fecha_fin: item.fecha_fin ? item.fecha_fin.slice(0, 16) : "",
    });
    setShowModal(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.nueva_ram) delete payload.nueva_ram;
      if (!payload.nuevo_almacenamiento) delete payload.nuevo_almacenamiento;
      if (!payload.nuevo_procesador) delete payload.nuevo_procesador;
      if (!payload.fecha_inicio) delete payload.fecha_inicio;
      if (!payload.fecha_fin) delete payload.fecha_fin;

      if (editing) {
        await api.updateMantenimiento(editing.id, payload);
      } else {
        await api.createMantenimiento(payload);
      }
      setShowModal(false);
      load();
    } catch (e) { alert("Error al guardar: " + JSON.stringify(e.data || e)); }
  }

  async function remove(id) {
    if (!confirm("Eliminar este registro de mantenimiento?")) return;
    await api.deleteMantenimiento(id);
    load();
  }

  const fmt = (v) => Number(v || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wrench className="w-7 h-7 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Bitacora de Mantenimiento</h2>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Nuevo Registro
        </button>
      </div>

      {/* Resumen de costos */}
      {costos && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Registros", value: costos.total_registros, icon: FileText },
            { label: "Costo Repuestos", value: fmt(costos.total_repuestos), icon: DollarSign },
            { label: "Costo Mano de Obra", value: fmt(costos.total_mano_obra), icon: DollarSign },
            { label: "Costo Total", value: fmt(costos.costo_total), icon: DollarSign },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><c.icon className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-lg font-bold text-gray-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Buscar..." className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setTimeout(load, 0); }}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {TIPO_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setTimeout(load, 0); }}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {ESTADO_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No hay registros de mantenimiento.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Descripcion</th>
                <th className="px-4 py-3 text-right">Costo Total</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                    <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{item.equipo_tipo}</span>
                      <br /><span className="text-xs text-gray-500">{item.equipo_numero_serie || `#${item.object_id}`}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.tipo === "preventivo" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                        {item.tipo_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[item.estado]}`}>
                        {item.estado_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{item.descripcion}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(item.costo_total)}</td>
                    <td className="px-4 py-3 text-xs">{new Date(item.fecha_creacion).toLocaleDateString("es-CO")}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {expanded === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <button onClick={e => { e.stopPropagation(); openEdit(item); }} className="text-blue-600 hover:underline text-xs">Editar</button>
                        <button onClick={e => { e.stopPropagation(); remove(item.id); }} className="text-red-600 hover:underline text-xs ml-2">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr><td colSpan="8" className="bg-gray-50 px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div><strong>Diagnostico:</strong><br />{item.diagnostico || "N/A"}</div>
                        <div><strong>Componentes cambiados:</strong><br />{item.componentes_cambiados || "N/A"}</div>
                        <div><strong>Proveedor externo:</strong><br />{item.proveedor_externo || "N/A"}</div>
                        <div><strong>Tecnico:</strong><br />{item.tecnico_nombre || "Sin asignar"}</div>
                        <div><strong>Costo repuestos:</strong> {fmt(item.costo_repuestos)}</div>
                        <div><strong>Costo mano de obra:</strong> {fmt(item.costo_mano_obra)}</div>
                        {item.nueva_ram_nombre && <div><strong>Nueva RAM:</strong> {item.nueva_ram_nombre}</div>}
                        {item.nuevo_almacenamiento_nombre && <div><strong>Nuevo almacenamiento:</strong> {item.nuevo_almacenamiento_nombre}</div>}
                        {item.nuevo_procesador_nombre && <div><strong>Nuevo procesador:</strong> {item.nuevo_procesador_nombre}</div>}
                        <div><strong>Notas:</strong><br />{item.notas || "N/A"}</div>
                        {item.archivos?.length > 0 && (
                          <div className="col-span-full">
                            <strong>Archivos adjuntos:</strong>
                            <ul className="mt-1 space-y-1">
                              {item.archivos.map(a => (
                                <li key={a.id}><a href={a.archivo} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{a.tipo_display} - {a.descripcion || a.archivo.split("/").pop()}</a></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de creacion/edicion */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar Mantenimiento" : "Nuevo Mantenimiento"} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de equipo</label>
              <select value={form.equipo_tipo} onChange={e => setForm({ ...form, equipo_tipo: e.target.value, equipo_id: "" })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="computador">Computador</option>
                <option value="celular">Celular</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Equipo</label>
              <select value={form.equipo_id} onChange={e => setForm({ ...form, equipo_id: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {(form.equipo_tipo === "computador" ? computadores : form.equipo_tipo === "monitor" ? monitores : celulares).map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.numero_serie} - {eq.marca?.nombre || eq.marca} {eq.modelo?.nombre || eq.modelo}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de mantenimiento</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {TIPO_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {ESTADO_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Diagnostico</label>
            <textarea value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripcion del trabajo *</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Componentes cambiados</label>
            <textarea value={form.componentes_cambiados} onChange={e => setForm({ ...form, componentes_cambiados: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej: RAM 8GB -> 16GB, SSD 256GB -> 512GB" />
          </div>

          {/* Actualizar specs */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <input type="checkbox" checked={form.actualizar_specs} onChange={e => setForm({ ...form, actualizar_specs: e.target.checked })} className="rounded" />
              Actualizar especificaciones del equipo automaticamente
            </label>
            {form.actualizar_specs && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="text-xs text-gray-600">Nueva RAM</label>
                  <select value={form.nueva_ram} onChange={e => setForm({ ...form, nueva_ram: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">Sin cambio</option>
                    {rams.map(r => <option key={r.id} value={r.id}>{r.capacidad}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Nuevo almacenamiento</label>
                  <select value={form.nuevo_almacenamiento} onChange={e => setForm({ ...form, nuevo_almacenamiento: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">Sin cambio</option>
                    {almacenamientos.map(a => <option key={a.id} value={a.id}>{a.capacidad}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Nuevo procesador</label>
                  <select value={form.nuevo_procesador} onChange={e => setForm({ ...form, nuevo_procesador: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">Sin cambio</option>
                    {procesadores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Costo repuestos</label>
              <input type="number" step="0.01" value={form.costo_repuestos} onChange={e => setForm({ ...form, costo_repuestos: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costo mano de obra</label>
              <input type="number" step="0.01" value={form.costo_mano_obra} onChange={e => setForm({ ...form, costo_mano_obra: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Proveedor externo</label>
            <input value={form.proveedor_externo} onChange={e => setForm({ ...form, proveedor_externo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
