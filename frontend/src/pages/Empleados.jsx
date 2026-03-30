import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Building2, UserPlus } from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

export default function Empleados() {
  const [areas, setAreas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [section, setSection] = useState("empleados");

  // Modals
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [delId, setDelId] = useState(null);
  const [delType, setDelType] = useState("");

  const fetchAll = () => {
    api.getAreas().then(setAreas).catch(() => {});
    api.getEmpleados().then((d) => setEmpleados(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  };
  useEffect(fetchAll, []);

  // ── Áreas ──
  const openCreateArea = () => {
    setSection("areas"); setEditId(null);
    setForm({ nombre: "", descripcion: "" }); setErrors({}); setModal(true);
  };
  const openEditArea = (a) => {
    setSection("areas"); setEditId(a.id);
    setForm({ nombre: a.nombre, descripcion: a.descripcion }); setErrors({}); setModal(true);
  };

  // ── Empleados ──
  const openCreateEmp = () => {
    setSection("empleados"); setEditId(null);
    setForm({ nombre: "", email: "", cargo: "", area: "", activo: true }); setErrors({}); setModal(true);
  };
  const openEditEmp = (e) => {
    setSection("empleados"); setEditId(e.id);
    setForm({ nombre: e.nombre, email: e.email, cargo: e.cargo, area: e.area, activo: e.activo });
    setErrors({}); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    try {
      if (section === "areas") {
        editId ? await api.updateArea(editId, form) : await api.createArea(form);
      } else {
        editId ? await api.updateEmpleado(editId, form) : await api.createEmpleado(form);
      }
      setModal(false); fetchAll();
    } catch (err) { if (err.data) setErrors(err.data); }
  };

  const confirmDel = async () => {
    try {
      delType === "area" ? await api.deleteArea(delId) : await api.deleteEmpleado(delId);
    } catch (e) { console.error(e); }
    setDelId(null); fetchAll();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Empleados y Áreas</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Áreas */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Áreas</span>
            <button onClick={openCreateArea} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y">
            {areas.length === 0
              ? <p className="text-center py-6 text-gray-500 text-sm">Sin áreas</p>
              : areas.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-sm">{a.nombre}</div>
                    <div className="text-xs text-gray-500">{a.cantidad_empleados} empleados</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditArea(a)} className="p-1 text-gray-400 hover:text-amber-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setDelId(a.id); setDelType("area"); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Empleados */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Empleados</span>
            <button onClick={openCreateEmp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cargo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Área</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {empleados.length === 0
                  ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Sin empleados</td></tr>
                  : empleados.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{e.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{e.email}</td>
                      <td className="px-4 py-3 text-gray-600">{e.cargo}</td>
                      <td className="px-4 py-3 text-gray-600">{e.area_nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {e.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditEmp(e)} className="p-1 text-gray-400 hover:text-amber-600"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setDelId(e.id); setDelType("empleado"); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? `Editar ${section === "areas" ? "Área" : "Empleado"}` : `${section === "areas" ? "Nueva Área" : "Nuevo Empleado"}`}>
        <form onSubmit={submit} className="space-y-4">
          {section === "areas" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion || ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" required value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                  <input type="text" required value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
                  <select required value={form.area || ""} onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar…</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="rounded border-gray-300" />
                Empleado activo
              </label>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editId ? "Actualizar" : "Crear"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Eliminar este registro?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={confirmDel} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>
    </div>
  );
}