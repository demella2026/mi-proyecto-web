import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Wifi, Search } from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

const ESTADOS = [
  { value: "EN_USO",    label: "En Uso",    color: "bg-green-100 text-green-800" },
  { value: "EN_BODEGA", label: "En Bodega", color: "bg-blue-100 text-blue-800" },
  { value: "SUSPENDIDA",label: "Suspendida",color: "bg-yellow-100 text-yellow-800" },
  { value: "DE_BAJA",   label: "De Baja",   color: "bg-red-100 text-red-800" },
];

const OPERADORES = [
  { value: "ENTEL",   label: "Entel" },
  { value: "MOVISTAR",label: "Movistar" },
  { value: "CLARO",   label: "Claro" },
  { value: "WOM",     label: "WOM" },
  { value: "OTRO",    label: "Otro" },
];

const ESTADO_COLOR = Object.fromEntries(ESTADOS.map((e) => [e.value, e.color]));

const blank = () => ({
  numero_linea: "", operador: "ENTEL", iccid: "", plan: "",
  celular: "", empleado_asignado: "", estado: "EN_BODEGA", notas: "",
});

export default function Chips() {
  const [chips, setChips]       = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [celulares, setCelulares] = useState([]);
  const [search, setSearch]     = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [operFiltro, setOperFiltro]     = useState("");

  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(blank());
  const [errors, setErrors]     = useState({});
  const [delId, setDelId]       = useState(null);
  const [detalle, setDetalle]   = useState(null);

  const fetchAll = () => {
    api.getChips().then((d) => setChips(Array.isArray(d) ? d : d.results || [])).catch(() => {});
    api.getEmpleados().then((d) => setEmpleados(Array.isArray(d) ? d : d.results || [])).catch(() => {});
    // Solo celulares con empleado asignado: no tiene sentido insertar un chip en un teléfono sin dueño
    api.getCelularesConEmpleado().then((d) => setCelulares(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  };
  useEffect(fetchAll, []);

  const openCreate = () => {
    setEditId(null); setForm(blank()); setErrors({}); setModal(true);
  };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      numero_linea:      c.numero_linea || "",
      operador:          c.operador || "ENTEL",
      iccid:             c.iccid || "",
      plan:              c.plan || "",
      celular:           c.celular || "",
      empleado_asignado: c.empleado_asignado?.id || c.empleado_asignado || "",
      estado:            c.estado || "EN_BODEGA",
      notas:             c.notas || "",
    });
    setErrors({}); setModal(true);
  };

  // ── Validaciones de número de línea e ICCID ──────────────────────
  const validate = () => {
    const errs = {};
    const linea = (form.numero_linea || "").replace(/\s/g, "");
    if (linea) {
      if (!/^\d+$/.test(linea)) {
        errs.numero_linea = "Solo se permiten dígitos (sin letras ni espacios).";
      } else if (!linea.startsWith("56") || linea.length !== 11) {
        errs.numero_linea = "Formato: +56 XXXX XXXX (11 dígitos sin el '+').";
      }
    }
    const iccid = (form.iccid || "").replace(/\s/g, "");
    if (iccid) {
      if (!/^\d+$/.test(iccid)) {
        errs.iccid = "El ICCID solo puede contener dígitos.";
      } else if (iccid.length < 18 || iccid.length > 22) {
        errs.iccid = `El ICCID debe tener entre 18 y 22 dígitos (actualmente ${iccid.length}).`;
      }
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    const clientErrs = validate();
    if (Object.keys(clientErrs).length) { setErrors(clientErrs); return; }

    const data = { ...form };
    // Guardar número de línea sin espacios, con prefijo +56 normalizado
    if (data.numero_linea) {
      const digits = data.numero_linea.replace(/\D/g, "");
      data.numero_linea = `+${digits}`;
    } else {
      data.numero_linea = null;
    }
    if (data.iccid) data.iccid = data.iccid.replace(/\s/g, "");
    else data.iccid = null;
    if (!data.celular)           data.celular = null;
    if (!data.empleado_asignado) data.empleado_asignado = null;
    try {
      editId ? await api.updateChip(editId, data) : await api.createChip(data);
      setModal(false); fetchAll();
    } catch (err) { if (err.data) setErrors(err.data); }
  };

  const confirmDel = async () => {
    try { await api.deleteChip(delId); } catch (e) { console.error(e); }
    setDelId(null); fetchAll();
  };

  const chipsFiltrados = chips.filter((c) => {
    const matchSearch = !search || (
      c.numero_linea?.includes(search) ||
      c.iccid?.includes(search) ||
      c.plan?.toLowerCase().includes(search.toLowerCase())
    );
    const matchEstado = !estadoFiltro || c.estado === estadoFiltro;
    const matchOper   = !operFiltro   || c.operador === operFiltro;
    return matchSearch && matchEstado && matchOper;
  });

  const enUso    = chips.filter((c) => c.estado === "EN_USO").length;
  const enBodega = chips.filter((c) => c.estado === "EN_BODEGA").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="w-6 h-6 text-purple-600" /> Chips / SIM
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {enUso} en uso · {enBodega} en bodega · {chips.length} total
          </p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
          <Plus className="w-4 h-4" /> Nuevo Chip
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por número, ICCID o plan…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500" />
        </div>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select value={operFiltro} onChange={(e) => setOperFiltro(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500">
          <option value="">Todos los operadores</option>
          {OPERADORES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Número</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Operador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">ICCID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Asignado a</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Celular</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {chipsFiltrados.length === 0
                ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin chips registrados</td></tr>
                : chipsFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold">{c.numero_linea || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{c.operador_display || c.operador}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                      {c.iccid || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{c.plan || "—"}</td>
                    <td className="px-4 py-3">
                      {c.empleado_asignado
                        ? <div>
                            <div className="font-medium">{c.empleado_asignado.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{c.empleado_asignado.area_nombre}</div>
                          </div>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                      {c.celular_str || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[c.estado] || "bg-gray-100 text-gray-700"}`}>
                        {c.estado_display || c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex gap-1 justify-end">
                      <button onClick={() => setDetalle(c)} className="p-1 text-gray-400 hover:text-blue-600" title="Ver detalle">
                        <Wifi className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-amber-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDelId(c.id)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? "Editar Chip / SIM" : "Nuevo Chip / SIM"}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de línea</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l-lg bg-gray-100 text-sm text-gray-500 font-mono select-none">+56</span>
                <input type="text" inputMode="numeric"
                  value={(form.numero_linea || "").replace(/^\+?56/, "").replace(/\D/g, "")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setForm({ ...form, numero_linea: digits ? `56${digits}` : "" });
                  }}
                  className="flex-1 px-3 py-2 border rounded-r-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
                  placeholder="9 XXXX XXXX" maxLength={9} />
              </div>
              {errors.numero_linea && <p className="text-red-500 text-xs mt-1">{errors.numero_linea}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operador *</label>
              <select required value={form.operador || ""}
                onChange={(e) => setForm({ ...form, operador: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                {OPERADORES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ICCID <span className="text-gray-400 font-normal text-xs">(18-22 dígitos)</span></label>
              <input type="text" inputMode="numeric"
                value={form.iccid || ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 22);
                  setForm({ ...form, iccid: digits });
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
                placeholder="" maxLength={22} />
              {form.iccid && <p className="text-xs text-gray-400 mt-0.5">{form.iccid.length} dígitos</p>}
              {errors.iccid && <p className="text-red-500 text-xs mt-1">{errors.iccid}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <input type="text" value={form.plan || ""}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                placeholder="" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
              <select required value={form.estado || ""}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empleado asignado</label>
              <select value={form.empleado_asignado || ""}
                onChange={(e) => setForm({ ...form, empleado_asignado: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                <option value="">Sin asignar</option>
                {empleados.filter((e) => e.activo).map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Celular donde se insertará el chip
                <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
              </label>
              {celulares.length === 0 ? (
                <div className="w-full px-3 py-2 border rounded-lg text-sm bg-amber-50 border-amber-200 text-amber-700">
                  ⚠️ No hay celulares con empleado asignado. Primero asigna el celular a un empleado en la sección Celulares.
                </div>
              ) : (
                <select value={form.celular || ""}
                  onChange={(e) => setForm({ ...form, celular: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                  <option value="">Sin asociar</option>
                  {celulares.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.marca?.nombre} {c.modelo?.nombre}
                      {" — "}
                      {c.empleado_asignado?.nombre_completo || "sin empleado"}
                      {c.imei ? ` (IMEI: ${c.imei})` : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Solo se muestran teléfonos con empleado asignado.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notas || ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700">
              {editId ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle */}
      {detalle && (
        <Modal open={!!detalle} onClose={() => setDetalle(null)} title="Detalle Chip / SIM">
          <dl className="space-y-3 text-sm">
            {[
              ["Número de línea", detalle.numero_linea || "—"],
              ["Operador",        detalle.operador_display || detalle.operador],
              ["ICCID",           detalle.iccid || "—"],
              ["Plan",            detalle.plan || "—"],
              ["Estado",          detalle.estado_display || detalle.estado],
              ["Empleado",        detalle.empleado_asignado?.nombre_completo || "Sin asignar"],
              ["Área",            detalle.empleado_asignado?.area_nombre || "—"],
              ["Celular",         detalle.celular_str || "—"],
              ["Ingreso",         detalle.fecha_ingreso || "—"],
              ["Notas",           detalle.notas || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b pb-2">
                <dt className="text-gray-500 font-medium">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end mt-4">
            <button onClick={() => setDetalle(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cerrar</button>
          </div>
        </Modal>
      )}

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Eliminar este chip / SIM?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={confirmDel} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
        </div>
      </Modal>
    </div>
  );
}
