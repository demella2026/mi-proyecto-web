import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Building2, UserPlus, Search } from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

export default function Empleados() {
  const [areas, setAreas]               = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [empleados, setEmpleados]       = useState([]);
  const [section, setSection]           = useState("empleados");
  const [search, setSearch]             = useState("");
  const [areaFiltro, setAreaFiltro]     = useState("");

  // Modals
  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState({});
  const [errors, setErrors] = useState({});
  const [delId, setDelId]   = useState(null);
  const [delType, setDelType] = useState("");

  const fetchAll = () => {
    api.getAreas().then(setAreas).catch(() => {});
    api.getCentrosCosto().then((d) => setCentrosCosto(Array.isArray(d) ? d : d.results || [])).catch(() => {});
    api.getEmpleados().then((d) => setEmpleados(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  };
  useEffect(fetchAll, []);

  // Centros de costo filtrados segun el area seleccionada en el form
  const ccFiltrados = form.area
    ? centrosCosto.filter((c) => String(c.area) === String(form.area) && c.activo)
    : centrosCosto.filter((c) => c.activo);

  // ── Áreas ──
  const openCreateArea = () => {
    setSection("areas"); setEditId(null);
    setForm({ nombre: "", descripcion: "" }); setErrors({}); setModal(true);
  };
  const openEditArea = (a) => {
    setSection("areas"); setEditId(a.id);
    setForm({ nombre: a.nombre, descripcion: a.descripcion || "" });
    setErrors({}); setModal(true);
  };

  // ── Empleados ──
  const openCreateEmp = () => {
    setSection("empleados"); setEditId(null);
    setForm({
      numero_documento: "", username: "",
      first_name: "", last_name: "",
      cargo: "", email: "",
      area: "", centro_costo: "",
      activo: true,
    });
    setErrors({}); setModal(true);
  };
  const openEditEmp = (e) => {
    setSection("empleados"); setEditId(e.id);
    setForm({
      numero_documento: e.numero_documento || "",
      username:         e.username || "",
      first_name:       e.first_name || "",
      last_name:        e.last_name || "",
      cargo:            e.cargo || "",
      email:            e.email || "",
      area:             e.area || "",
      centro_costo:     e.centro_costo || "",
      activo:           e.activo,
    });
    setErrors({}); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    // Limpiar campos vacíos opcionales para evitar errores de unicidad
    const data = { ...form };
    if (!data.centro_costo) data.centro_costo = null;
    if (!data.area)         data.area = null;
    try {
      if (section === "areas") {
        editId ? await api.updateArea(editId, form) : await api.createArea(form);
      } else {
        editId ? await api.updateEmpleado(editId, data) : await api.createEmpleado(data);
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

  // Filtrado local de empleados
  const empleadosFiltrados = empleados.filter((e) => {
    const matchSearch = !search || (
      e.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
      e.username?.toLowerCase().includes(search.toLowerCase()) ||
      e.cargo?.toLowerCase().includes(search.toLowerCase())
    );
    const matchArea = !areaFiltro || String(e.area) === areaFiltro;
    return matchSearch && matchArea;
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Empleados y Áreas</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Áreas */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Áreas
            </span>
            <button onClick={openCreateArea} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {areas.length === 0
              ? <p className="text-center py-6 text-gray-500 text-sm">Sin áreas</p>
              : areas.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-sm">{a.nombre}</div>
                    <div className="text-xs text-gray-500">{a.cantidad_empleados} empleados</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditArea(a)} className="p-1 text-gray-400 hover:text-amber-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setDelId(a.id); setDelType("area"); }} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Empleados */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Empleados
            </span>
            <button onClick={openCreateEmp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 px-4 py-3 border-b bg-gray-50">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, username o cargo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={areaFiltro}
              onChange={(e) => setAreaFiltro(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Username</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cargo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Área</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">C. Costo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 w-20">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {empleadosFiltrados.length === 0
                  ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">Sin empleados</td></tr>
                  : empleadosFiltrados.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{e.nombre_completo}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{e.username}</td>
                      <td className="px-4 py-3 text-gray-600">{e.cargo}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{e.area_nombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{e.centro_costo_str || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {e.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditEmp(e)} className="p-1 text-gray-400 hover:text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setDelId(e.id); setDelType("empleado"); }} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        title={editId
          ? `Editar ${section === "areas" ? "Área" : "Empleado"}`
          : `${section === "areas" ? "Nueva Área" : "Nuevo Empleado"}`
        }>
        <form onSubmit={submit} className="space-y-4">
          {section === "areas" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion || ""}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" required value={form.first_name || ""}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input type="text" required value={form.last_name || ""}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N.º Documento</label>
                  <input type="text" value={form.numero_documento || ""}
                    onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {errors.numero_documento && <p className="text-red-500 text-xs mt-1">{errors.numero_documento}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" value={form.username || ""}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="dominio\usuario" />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <input type="text" value={form.cargo || ""}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400 font-normal">(para envío de actas)</span>
                  </label>
                  <input type="email" value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="nombre@ejemplo.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <select value={form.area || ""}
                    onChange={(e) => setForm({ ...form, area: e.target.value, centro_costo: "" })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar…</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Centro de Costo</label>
                  <select value={form.centro_costo || ""}
                    onChange={(e) => setForm({ ...form, centro_costo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin asignar</option>
                    {ccFiltrados.map((c) => (
                      <option key={c.id} value={c.id}>{c.codigo} – {c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="rounded border-gray-300" />
                Empleado activo
              </label>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              {editId ? "Actualizar" : "Crear"}
            </button>
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
