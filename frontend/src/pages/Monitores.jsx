import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, FileSpreadsheet, History } from "lucide-react";
import Modal from "../components/Modal";
import api, { downloadBlob } from "../api";

const ESTADOS = [
  { value: "EN_USO",               label: "En Uso" },
  { value: "EN_BODEGA",            label: "En Bodega" },
  { value: "EN_REPARACION",        label: "En Reparación" },
  { value: "PENDIENTE_DEVOLUCION", label: "Pendiente Devolución" },
  { value: "DE_BAJA",              label: "De Baja" },
];

const BADGE = {
  EN_USO:               "bg-green-100 text-green-800",
  EN_BODEGA:            "bg-blue-100 text-blue-800",
  EN_REPARACION:        "bg-yellow-100 text-yellow-800",
  PENDIENTE_DEVOLUCION: "bg-orange-100 text-orange-800",
  DE_BAJA:              "bg-red-100 text-red-800",
};

const empty = () => ({
  numero_inventario: "",
  marca: "",
  modelo: "",
  numero_serie: "",
  estado: "EN_BODEGA",
  computador: "",
  centro_costo: "",
  fecha_ingreso: "",
  notas: "",
});

export default function Monitores() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("");

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [computadores, setComputadores] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty());
  const [errors, setErrors] = useState({});

  const [delId, setDelId] = useState(null);
  const [histModal, setHistModal] = useState(null);
  const [histData, setHistData] = useState([]);

  const fetch_ = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (filtro) p.set("estado", filtro);
    api.getMonitores(p.toString())
      .then((d) => setRows(d.results || d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filtro]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    Promise.all([
      api.getMarcasPorTipo("MONITOR"),
      api.getModelosPorTipo("MONITOR"),
      // Solo computadores con empleado asignado: no tiene sentido conectar un monitor a un equipo sin dueño
      api.getComputadoresConEmpleado(),
      api.getCentrosCosto(),
    ]).then(([m, mo, c, cc]) => {
      setMarcas(m);
      setModelos(mo);
      setComputadores(Array.isArray(c) ? c : c.results || []);
      setCentrosCosto(Array.isArray(cc) ? cc : cc.results || []);
    });
  }, []);

  const openCreate = () => { setEditId(null); setForm(empty()); setErrors({}); setModal(true); };
  const openEdit = (mon) => {
    setEditId(mon.id);
    setForm({
      numero_inventario: mon.numero_inventario || "",
      marca:       mon.marca?.id  || "",
      modelo:      mon.modelo?.id || "",
      numero_serie: mon.numero_serie || "",
      estado:      mon.estado,
      computador:  mon.computador?.id || mon.computador || "",
      centro_costo: mon.centro_costo?.id || mon.centro_costo || "",
      fecha_ingreso: mon.fecha_ingreso || "",
      notas:       mon.notas || "",
    });
    setErrors({});
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const payload = { ...form };
    if (!payload.computador)   payload.computador   = null;
    if (!payload.centro_costo) payload.centro_costo = null;
    try {
      editId ? await api.updateMonitor(editId, payload) : await api.createMonitor(payload);
      setModal(false);
      fetch_();
    } catch (err) {
      if (err.data) setErrors(err.data);
    }
  };

  const confirmDelete = async () => {
    await api.deleteMonitor(delId).catch(console.error);
    setDelId(null);
    fetch_();
  };

  const openHist = async (id) => {
    setHistModal(id);
    setHistData(await api.monitorHistorial(id).catch(() => []));
  };

  const filteredModelos = modelos
    .filter((m) => m.tipo_equipo === "MONITOR")
    .filter((m) => !form.marca || m.marca === Number(form.marca));

  const Sel = ({ label, name, options, display, required }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <select value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required={required}>
        <option value="">Seleccionar…</option>
        {(options || []).map((o) => <option key={o.id} value={o.id}>{display(o)}</option>)}
      </select>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Monitores</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => api.monitoresExcel().then((b) => downloadBlob(b, "monitores.xlsx"))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Monitor
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["N° Inventario", "Marca / Modelo", "N° Serie", "Estado", "Computador", "CC / Obra", "Acciones"].map((h, i) => (
                  <th key={h} className={`text-left px-4 py-3 font-semibold text-gray-600
                    ${i === 4 ? "hidden lg:table-cell" : ""}
                    ${i === 5 ? "hidden md:table-cell" : ""}
                    ${i === 6 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Sin resultados</td></tr>
              ) : rows.map((mon) => (
                <tr key={mon.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{mon.numero_inventario || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{mon.marca?.nombre || "—"}</div>
                    <div className="text-gray-500 text-xs">{mon.modelo?.nombre || "—"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{mon.numero_serie || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${BADGE[mon.estado]}`}>{mon.estado_display}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {mon.computador_str
                      ? <span className="text-xs font-medium">{mon.computador_str}</span>
                      : <span className="text-xs text-gray-400">No conectado</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {mon.centro_costo
                      ? <><div className="text-xs font-medium">{mon.centro_costo.codigo}</div>
                         <div className="text-xs text-gray-400">{mon.centro_costo.nombre}</div></>
                      : <span className="text-xs text-gray-400">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openHist(mon.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><History className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(mon)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDelId(mon.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Editar Monitor" : "Nuevo Monitor"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Inventario *</label>
              <input type="text" required value={form.numero_inventario}
                onChange={(e) => setForm({ ...form, numero_inventario: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.numero_inventario && <p className="text-red-500 text-xs mt-1">{errors.numero_inventario}</p>}
            </div>
            <Sel label="Marca" name="marca" options={marcas} display={(o) => o.nombre} required />
            <Sel label="Modelo" name="modelo" options={filteredModelos} display={(o) => o.nombre} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Serie</label>
              <input type="text" value={form.numero_serie}
                onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.numero_serie && <p className="text-red-500 text-xs mt-1">{errors.numero_serie}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required>
                {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              {errors.estado && <p className="text-red-500 text-xs mt-1">{errors.estado}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Computador Conectado</label>
              {computadores.length === 0 ? (
                <div className="w-full px-3 py-2 border rounded-lg text-sm bg-amber-50 border-amber-200 text-amber-700">
                  ⚠️ No hay computadores con empleado asignado. Primero asigna el equipo a un empleado en Computadores.
                </div>
              ) : (
                <select value={form.computador}
                  onChange={(e) => setForm({ ...form, computador: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin conectar</option>
                  {computadores.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.numero_inventario || "—"} — {o.empleado_asignado?.nombre_completo || ""}
                      {" "}({o.marca?.nombre} {o.modelo?.nombre})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">Solo se muestran computadores con empleado asignado.</p>
              {errors.computador && <p className="text-red-500 text-xs mt-1">{errors.computador}</p>}
            </div>
            <Sel label="Centro de Costo / Obra" name="centro_costo" options={centrosCosto}
              display={(o) => `${o.codigo} — ${o.nombre}`} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label>
              <input type="date" value={form.fecha_ingreso}
                onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.fecha_ingreso && <p className="text-red-500 text-xs mt-1">{errors.fecha_ingreso}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editId ? "Actualizar" : "Crear"}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar */}
      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Estás seguro de eliminar este monitor? No se puede deshacer.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
          <button onClick={confirmDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>

      {/* Modal Historial */}
      <Modal open={!!histModal} onClose={() => setHistModal(null)} title="Historial de Cambios" wide>
        {histData.length === 0
          ? <p className="text-gray-500 text-center py-4">Sin cambios registrados.</p>
          : <div className="space-y-3 max-h-96 overflow-y-auto">
              {histData.map((r, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{r.tipo_cambio}</span>
                    <span className="text-xs text-gray-500">{new Date(r.fecha).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Por: {r.usuario}</p>
                  {r.cambios?.length > 0 && r.cambios.map((c, j) => (
                    <div key={j} className="text-xs bg-gray-50 rounded p-2 mb-1">
                      <span className="font-medium">{c.campo}: </span>
                      <span className="text-red-500 line-through">{c.anterior}</span>
                      {" → "}
                      <span className="text-green-600">{c.nuevo}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
        }
      </Modal>
    </div>
  );
}
