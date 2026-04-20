import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit, Trash2, Search, ShieldCheck,
  HardHat, Eye, User, KeyRound,
} from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

const ROLES = [
  { value: "ADMIN",          label: "Administrador",      icon: ShieldCheck, color: "purple" },
  { value: "ENCARGADO_OBRA", label: "Encargado de Obra",  icon: HardHat,     color: "orange" },
  { value: "VIEWER",         label: "Solo Lectura",        icon: Eye,         color: "gray"   },
];

const ROL_BADGE = {
  ADMIN:          "bg-purple-100 text-purple-700",
  ENCARGADO_OBRA: "bg-orange-100 text-orange-700",
  VIEWER:         "bg-gray-100 text-gray-600",
};

const blank = () => ({
  username: "", first_name: "", last_name: "", email: "",
  password: "", rol: "VIEWER", centro_costo: "", is_active: true,
});

export default function Usuarios() {
  const [usuarios, setUsuarios]       = useState([]);
  const [centros, setCentros]         = useState([]);
  const [search, setSearch]           = useState("");
  const [rolFiltro, setRolFiltro]     = useState("");

  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState(blank());
  const [errors, setErrors] = useState({});
  const [delId, setDelId]   = useState(null);
  const [showPass, setShowPass] = useState(false);

  /**
   * Carga usuarios y lista de CC activos en paralelo.
   * Los CC activos se usan para el selector de 'Centro de Costo asignado' en el formulario
   * (solo visible cuando rol === ENCARGADO_OBRA).
   */
  const fetchAll = useCallback(() => {
    api.getUsuarios().then((d) => setUsuarios(Array.isArray(d) ? d : d.results || [])).catch(() => {});
    api.getCentrosCosto("activo=true").then((d) => setCentros(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, []);

  useEffect(fetchAll, [fetchAll]);

  /** Abre el modal en modo creación con todos los campos en blanco y contraseña oculta. */
  const openCreate = () => {
    setEditId(null); setForm(blank()); setErrors({});
    setShowPass(false); setModal(true);
  };

  /**
   * Abre el modal en modo edición precargando los datos del usuario seleccionado.
   * Extrae rol y centro_costo del objeto anidado perfil para llenar los campos planos del form.
   * La contraseña siempre arranca vacía — solo se cambia si el admin escribe una nueva.
   */
  const openEdit = (u) => {
    setEditId(u.id);
    setForm({
      username:    u.username,
      first_name:  u.first_name || "",
      last_name:   u.last_name  || "",
      email:       u.email      || "",
      password:    "",
      rol:         u.perfil?.rol          || "VIEWER",
      centro_costo: u.perfil?.centro_costo ?? "",
      is_active:   u.is_active,
    });
    setErrors({}); setShowPass(false); setModal(true);
  };

  /**
   * Envía el formulario para crear o actualizar un usuario.
   * - Si password está vacío lo elimina del payload (no cambiar contraseña en edición).
   * - Si centro_costo está vacío envía null (limpiar la FK en el backend).
   * - Los errores de validación del backend (400) se mapean al estado errors.
   */
  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    const data = { ...form };
    if (!data.password) delete data.password;
    if (!data.centro_costo) data.centro_costo = null;
    try {
      editId
        ? await api.updateUsuario(editId, data)
        : await api.createUsuario(data);
      setModal(false); fetchAll();
    } catch (err) {
      if (err.data) setErrors(err.data);
    }
  };

  /**
   * Confirma y ejecuta el borrado del usuario cuyo ID está en delId.
   * Después recarga la lista de usuarios.
   */
  const confirmDel = async () => {
    try { await api.deleteUsuario(delId); } catch (e) { console.error(e); }
    setDelId(null); fetchAll();
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchSearch = !search || (
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
    const matchRol = !rolFiltro || u.perfil?.rol === rolFiltro;
    return matchSearch && matchRol;
  });

  const selectedRolData = ROLES.find((r) => r.value === form.rol);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
          <p className="text-gray-500 text-sm mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar usuario…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">CC Asignado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-20">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuariosFiltrados.length === 0
                ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin usuarios</td></tr>
                : usuariosFiltrados.map((u) => {
                  const rol = u.perfil?.rol || "VIEWER";
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                            {(u.username || "?")[0]}
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.nombre_completo || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROL_BADGE[rol]}`}>
                          {ROLES.find((r) => r.value === rol)?.label || rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.perfil?.centro_costo_str || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {u.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(u)} className="p-1 text-gray-400 hover:text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDelId(u.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info roles */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const count = usuarios.filter((u) => u.perfil?.rol === r.value).length;
          return (
            <div key={r.value} className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${
                r.color === "purple" ? "bg-purple-100 text-purple-600" :
                r.color === "orange" ? "bg-orange-100 text-orange-600" :
                "bg-gray-100 text-gray-500"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-gray-500">{r.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? "Editar Usuario" : "Nuevo Usuario"}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input type="text" required value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input type="text" value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                {editId ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
              </label>
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editId}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder={editId ? "Sin cambios" : "Contraseña segura"} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = form.rol === r.value;
                return (
                  <button key={r.value} type="button"
                    onClick={() => setForm({ ...form, rol: r.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all
                      ${active
                        ? r.color === "purple" ? "border-purple-500 bg-purple-50 text-purple-700"
                          : r.color === "orange" ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-400 bg-gray-50 text-gray-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>
                    <Icon className="w-5 h-5" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Centro de Costo — solo para Encargado de Obra */}
          {form.rol === "ENCARGADO_OBRA" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Centro de Costo asignado *
              </label>
              <select value={form.centro_costo}
                onChange={(e) => setForm({ ...form, centro_costo: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar CC…</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Este usuario solo verá los equipos del CC seleccionado.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300" />
            Usuario activo
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              {editId ? "Actualizar" : "Crear Usuario"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Eliminar Usuario">
        <p className="text-gray-600 mb-6">¿Confirmas eliminar este usuario? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={confirmDel} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>
    </div>
  );
}
