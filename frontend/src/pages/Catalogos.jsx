import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

const TABS = [
  {
    key: "marcas", label: "Marcas",
    cols: ["nombre"], colLabels: ["Nombre"],
    fields: [{ name: "nombre", label: "Nombre", type: "text" }],
    get: api.getMarcas, create: api.createMarca, update: api.updateMarca, del: api.deleteMarca,
  },
  {
    key: "modelos", label: "Modelos",
    cols: ["marca_nombre", "nombre"], colLabels: ["Marca", "Nombre"],
    fields: [
      { name: "marca", label: "Marca", type: "select", optionsKey: "marcas", display: (o) => o.nombre },
      { name: "nombre", label: "Nombre", type: "text" },
    ],
    get: api.getModelos, create: api.createModelo, update: api.updateModelo, del: api.deleteModelo,
  },
  {
    key: "procesadores", label: "Procesadores",
    cols: ["nombre"], colLabels: ["Nombre"],
    fields: [{ name: "nombre", label: "Nombre", type: "text" }],
    get: api.getProcesadores, create: api.createProcesador, update: api.updateProcesador, del: api.deleteProcesador,
  },
  {
    key: "ram", label: "RAM",
    cols: ["capacidad"], colLabels: ["Capacidad"],
    fields: [{ name: "capacidad", label: "Capacidad (ej: 8GB)", type: "text" }],
    get: api.getRam, create: api.createRam, update: api.updateRam, del: api.deleteRam,
  },
  {
    key: "almacenamientos", label: "Almacenamiento",
    cols: ["capacidad"], colLabels: ["Capacidad"],
    fields: [{ name: "capacidad", label: "Capacidad (ej: 256GB SSD)", type: "text" }],
    get: api.getAlmacenamientos, create: api.createAlmacenamiento, update: api.updateAlmacenamiento, del: api.deleteAlmacenamiento,
  },
];

export default function Catalogos() {
  const [tab, setTab] = useState("marcas");
  const [data, setData] = useState({});
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [delId, setDelId] = useState(null);
  const [marcasOpts, setMarcasOpts] = useState([]);

  const current = TABS.find((t) => t.key === tab);

  const fetchTab = async (key) => {
    const t = TABS.find((x) => x.key === key);
    const d = await t.get().catch(() => []);
    setData((prev) => ({ ...prev, [key]: Array.isArray(d) ? d : d.results || [] }));
  };

  useEffect(() => {
    TABS.forEach((t) => fetchTab(t.key));
    api.getMarcas().then(setMarcasOpts).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditId(null);
    const f = {};
    current.fields.forEach((fi) => (f[fi.name] = ""));
    setForm(f); setErrors({}); setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    const f = {};
    current.fields.forEach((fi) => (f[fi.name] = row[fi.name] ?? ""));
    setForm(f); setErrors({}); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    try {
      editId ? await current.update(editId, form) : await current.create(form);
      setModal(false); fetchTab(tab);
      if (tab === "marcas") api.getMarcas().then(setMarcasOpts);
    } catch (err) { if (err.data) setErrors(err.data); }
  };

  const confirmDel = async () => {
    await current.del(delId).catch(console.error);
    setDelId(null); fetchTab(tab);
  };

  const rows = data[tab] || [];
  const optionsMap = { marcas: marcasOpts };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Catálogos</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-white rounded-xl shadow-sm border p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors
            ${tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">{current.label} ({rows.length})</span>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">ID</th>
              {current.colLabels.map((l) => (
                <th key={l} className="text-left px-4 py-3 font-semibold text-gray-600">{l}</th>
              ))}
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={current.cols.length + 2} className="text-center py-8 text-gray-500">Sin datos</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{r.id}</td>
                {current.cols.map((c) => (
                  <td key={c} className="px-4 py-3">{r[c]}</td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDelId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? `Editar ${current.label}` : `Nuevo ${current.label}`}>
        <form onSubmit={submit} className="space-y-4">
          {current.fields.map((fi) => (
            <div key={fi.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fi.label}</label>
              {fi.type === "select" ? (
                <select value={form[fi.name] || ""} onChange={(e) => setForm({ ...form, [fi.name]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Seleccionar…</option>
                  {(optionsMap[fi.optionsKey] || []).map((o) => (
                    <option key={o.id} value={o.id}>{fi.display(o)}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={form[fi.name] || ""} onChange={(e) => setForm({ ...form, [fi.name]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required />
              )}
              {errors[fi.name] && <p className="text-red-500 text-xs mt-1">{errors[fi.name]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editId ? "Actualizar" : "Crear"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Eliminar este registro? Si tiene equipos asociados, la operación fallará.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={confirmDel} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>
    </div>
  );
}