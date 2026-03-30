import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, FileSpreadsheet, FileText, History } from "lucide-react";
import Modal from "../components/Modal";
import api, { downloadBlob } from "../api";

const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "en_reparacion", label: "En Reparación" },
  { value: "de_baja", label: "De Baja" },
];
const BADGE = {
  activo: "bg-green-100 text-green-800",
  en_reparacion: "bg-yellow-100 text-yellow-800",
  de_baja: "bg-red-100 text-red-800",
};

const empty = () => ({
  imei: "", numero_serie: "", marca: "", modelo: "",
  ram: "", almacenamiento: "", estado: "activo", empleado_asignado: "", notas: "",
});

export default function Celulares() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("");

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [rams, setRams] = useState([]);
  const [almacenamientos, setAlmacenamientos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

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
    api.getCelulares(p.toString())
      .then((d) => setRows(d.results || d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filtro]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    Promise.all([api.getMarcas(), api.getModelos(), api.getRam(), api.getAlmacenamientos(), api.getEmpleados()])
      .then(([m, mo, r, a, e]) => {
        setMarcas(m); setModelos(mo); setRams(r);
        setAlmacenamientos(a); setEmpleados(e.filter((x) => x.activo));
      });
  }, []);

  const openCreate = () => { setEditId(null); setForm(empty()); setErrors({}); setModal(true); };
  const openEdit = (cl) => {
    setEditId(cl.id);
    setForm({
      imei: cl.imei, numero_serie: cl.numero_serie,
      marca: cl.marca.id, modelo: cl.modelo.id,
      ram: cl.ram.id, almacenamiento: cl.almacenamiento.id,
      estado: cl.estado, empleado_asignado: cl.empleado_asignado?.id || "",
      notas: cl.notas || "",
    });
    setErrors({}); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    const payload = { ...form };
    if (!payload.empleado_asignado) payload.empleado_asignado = null;
    try {
      editId ? await api.updateCelular(editId, payload) : await api.createCelular(payload);
      setModal(false); fetch_();
    } catch (err) { if (err.data) setErrors(err.data); }
  };

  const confirmDelete = async () => {
    await api.deleteCelular(delId).catch(console.error);
    setDelId(null); fetch_();
  };

  const openHist = async (id) => {
    setHistModal(id);
    setHistData(await api.celularHistorial(id).catch(() => []));
  };

  const filteredModelos = form.marca ? modelos.filter((m) => m.marca === Number(form.marca)) : modelos;

  const Sel = ({ label, name, options, display, required }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <select value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required={required}>
        <option value="">Seleccionar…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{display(o)}</option>)}
      </select>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Celulares</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => api.celularesExcel().then((b) => downloadBlob(b, "celulares.xlsx"))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => api.celularesPdf().then((b) => downloadBlob(b, "celulares.pdf"))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Celular
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por IMEI, N° serie…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">IMEI</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">N° Serie</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Marca / Modelo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">RAM</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Disco</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Asignado a</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Sin resultados</td></tr>
              ) : rows.map((cl) => (
                <tr key={cl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{cl.imei}</td>
                  <td className="px-4 py-3 font-mono text-xs">{cl.numero_serie}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{cl.marca.nombre}</div>
                    <div className="text-gray-500 text-xs">{cl.modelo.nombre}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{cl.ram.capacidad}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{cl.almacenamiento.capacidad}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${BADGE[cl.estado]}`}>{cl.estado_display}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {cl.empleado_asignado
                      ? <><div className="text-xs font-medium">{cl.empleado_asignado.nombre}</div><div className="text-xs text-gray-400">{cl.empleado_asignado.area_nombre}</div></>
                      : <span className="text-xs text-gray-400">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openHist(cl.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><History className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(cl)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDelId(cl.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Editar Celular" : "Nuevo Celular"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMEI *</label>
              <input type="text" required value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.imei && <p className="text-red-500 text-xs mt-1">{errors.imei}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Serie *</label>
              <input type="text" required value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.numero_serie && <p className="text-red-500 text-xs mt-1">{errors.numero_serie}</p>}
            </div>
            <Sel label="Marca" name="marca" options={marcas} display={(o) => o.nombre} required />
            <Sel label="Modelo" name="modelo" options={filteredModelos} display={(o) => o.nombre} required />
            <Sel label="RAM" name="ram" options={rams} display={(o) => o.capacidad} required />
            <Sel label="Almacenamiento" name="almacenamiento" options={almacenamientos} display={(o) => o.capacidad} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <Sel label="Asignar a empleado" name="empleado_asignado" options={empleados} display={(o) => `${o.nombre} — ${o.area_nombre}`} />
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

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Estás seguro de eliminar este celular?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
          <button onClick={confirmDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>

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
                  {r.cambios?.map((c, j) => (
                    <div key={j} className="text-xs bg-gray-50 rounded p-2 mb-1">
                      <span className="font-medium">{c.campo}: </span>
                      <span className="text-red-500 line-through">{c.anterior}</span>{" → "}
                      <span className="text-green-600">{c.nuevo}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>}
      </Modal>
    </div>
  );
}