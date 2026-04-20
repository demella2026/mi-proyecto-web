import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, FileSpreadsheet, FileText, History } from "lucide-react";
import Modal from "../components/Modal";
import api, { downloadBlob } from "../api";

const ESTADOS = [
  { value: "EN_USO", label: "En Uso" },
  { value: "EN_BODEGA", label: "En Bodega" },
  { value: "EN_REPARACION", label: "En Reparacion" },
  { value: "PENDIENTE_DEVOLUCION", label: "Pendiente Devolucion" },
  { value: "DE_BAJA", label: "De Baja" },
];

const TIPOS = [
  { value: "LAPTOP", label: "Laptop" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "ALL_IN_ONE", label: "All-in-One" },
  { value: "WORKSTATION", label: "Workstation" },
];

const BADGE = {
  EN_USO: "bg-green-100 text-green-800",
  EN_BODEGA: "bg-blue-100 text-blue-800",
  EN_REPARACION: "bg-yellow-100 text-yellow-800",
  PENDIENTE_DEVOLUCION: "bg-orange-100 text-orange-800",
  DE_BAJA: "bg-red-100 text-red-800",
};

// Extrae el sufijo numérico de "ELEQ-1234" → "1234"; si ya es solo numero, lo retorna.
const parseInvSuffix = (v = "") => {
  if (!v) return "";
  const upper = v.toUpperCase();
  if (upper.startsWith("ELEQ-")) return upper.slice(5);
  return v.replace(/\D/g, ""); // fallback: solo dígitos
};

const empty = () => ({
  invSuffix: "",           // campo UI: solo la parte numérica del inventario
  numero_serie: "",
  tipo_equipo: "LAPTOP",
  marca: "",
  modelo: "",
  procesador: "",
  ram: "",
  almacenamiento: "",
  sistema_operativo: "",
  estado: "EN_BODEGA",
  en_inventario: true,
  empleado_asignado: "",
  accesorios: "",
  comentario: "",
  notas: "",
});

export default function Computadores() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("");

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [procesadores, setProcesadores] = useState([]);
  const [rams, setRams] = useState([]);
  const [almacenamientos, setAlmacenamientos] = useState([]);
  const [sistemasOperativos, setSistemasOperativos] = useState([]);
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
    api.getComputadores(p.toString())
      .then((d) => setRows(d.results || d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filtro]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    Promise.all([
      api.getMarcasPorTipo("COMPUTADOR"),
      api.getModelosPorTipo("COMPUTADOR"),
      api.getProcesadores(),
      api.getRam(), api.getAlmacenamientos(), api.getSistemasOperativos(), api.getEmpleados(),
    ]).then(([m, mo, p, r, a, so, e]) => {
      setMarcas(m); setModelos(mo); setProcesadores(p);
      setRams(r); setAlmacenamientos(a); setSistemasOperativos(so); setEmpleados(e.filter((x) => x.activo));
    });
  }, []);

  const openCreate = () => { setEditId(null); setForm(empty()); setErrors({}); setModal(true); };
  const openEdit = (comp) => {
    setEditId(comp.id);
    setForm({
      invSuffix: parseInvSuffix(comp.numero_inventario),
      numero_serie: comp.numero_serie,
      tipo_equipo: comp.tipo_equipo,
      marca: comp.marca?.id || "",
      modelo: comp.modelo?.id || "",
      procesador: comp.procesador?.id || "",
      ram: comp.ram?.id || "",
      almacenamiento: comp.almacenamiento?.id || "",
      sistema_operativo: comp.sistema_operativo?.id || "",
      estado: comp.estado,
      en_inventario: comp.en_inventario ?? true,
      empleado_asignado: comp.empleado_asignado?.id || "",
      accesorios: comp.accesorios || "",
      comentario: comp.comentario || "",
      notas: comp.notas || "",
    });
    setErrors({});
    setModal(true);
  };

  // ── Validaciones del formulario ───────────────────────────────────────────
  const validate = () => {
    const errs = {};
    // N° inventario: solo dígitos
    if (form.invSuffix && !/^\d+$/.test(form.invSuffix)) {
      errs.invSuffix = "Solo se permiten números (sin letras ni espacios).";
    }
    // N° serie: sin espacios
    if (form.numero_serie && /\s/.test(form.numero_serie)) {
      errs.numero_serie = "El número de serie no puede contener espacios.";
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return; }

    // Construir payload: combinar prefijo + sufijo para numero_inventario
    const payload = {
      numero_inventario: form.invSuffix ? `ELEQ-${form.invSuffix}` : "",
      numero_serie: form.numero_serie,
      tipo_equipo: form.tipo_equipo,
      marca: form.marca,
      modelo: form.modelo,
      procesador: form.procesador,
      ram: form.ram,
      almacenamiento: form.almacenamiento,
      sistema_operativo: form.sistema_operativo,
      estado: form.estado,
      en_inventario: form.en_inventario,
      empleado_asignado: form.empleado_asignado || null,
      accesorios: form.accesorios,
      comentario: form.comentario,
      notas: form.notas,
    };

    try {
      editId ? await api.updateComputador(editId, payload) : await api.createComputador(payload);
      setModal(false);
      fetch_();
    } catch (err) { if (err.data) setErrors(err.data); }
  };

  const confirmDelete = async () => {
    await api.deleteComputador(delId).catch(console.error);
    setDelId(null);
    fetch_();
  };

  const openHist = async (id) => {
    setHistModal(id);
    const d = await api.computadorHistorial(id).catch(() => []);
    setHistData(d);
  };

  const filteredModelos = modelos
    .filter((m) => m.tipo_equipo === "COMPUTADOR")
    .filter((m) => !form.marca || m.marca === Number(form.marca));

  const Sel = ({ label, name, options, display, required }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <select value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        required={required}>
        <option value="">Seleccionar…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{display(o)}</option>)}
      </select>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Computadores</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => api.computadoresExcel().then((b) => downloadBlob(b, "computadores.xlsx"))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => api.computadoresPdf().then((b) => downloadBlob(b, "computadores.pdf"))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Computador
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
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
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
                {["N Inventario", "N Serie", "Tipo", "Marca/Modelo", "Procesador", "RAM", "Disco", "S.O.", "Estado", "Asignado a", "Acciones"].map((h, i) => (
                  <th key={h} className={`text-left px-4 py-3 font-semibold text-gray-600 ${i >= 4 && i <= 6 ? "hidden lg:table-cell" : ""} ${i === 7 ? "hidden xl:table-cell" : ""} ${i === 9 ? "hidden md:table-cell" : ""} ${i === 10 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-500">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-500">Sin resultados</td></tr>
              ) : rows.map((comp) => (
                <tr key={comp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{comp.numero_inventario}</td>
                  <td className="px-4 py-3 font-mono text-xs">{comp.numero_serie}</td>
                  <td className="px-4 py-3 text-sm">{comp.tipo_equipo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{comp.marca?.nombre || "-"}</div>
                    <div className="text-gray-500 text-xs">{comp.modelo?.nombre || "-"}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{comp.procesador?.nombre || "-"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{comp.ram?.capacidad || "-"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{comp.almacenamiento?.capacidad || "-"}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-gray-600">{comp.sistema_operativo?.nombre || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${BADGE[comp.estado]}`}>{comp.estado_display}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {comp.empleado_asignado
                      ? <><div className="text-xs font-medium">{comp.empleado_asignado.nombre_completo}</div><div className="text-xs text-gray-400">{comp.empleado_asignado.area_nombre}</div></>
                      : <span className="text-xs text-gray-400">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openHist(comp.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><History className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(comp)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDelId(comp.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Editar Computador" : "Nuevo Computador"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* N° Inventario con prefijo ELEQ- fijo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Inventario</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l-lg bg-gray-100 text-sm text-gray-500 font-mono select-none">
                  ELEQ-
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234"
                  value={form.invSuffix}
                  onChange={(e) => {
                    // Solo permitir dígitos
                    const val = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, invSuffix: val });
                  }}
                  className="flex-1 px-3 py-2 border rounded-r-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:z-10"
                />
              </div>
              {(errors.invSuffix || errors.numero_inventario) && (
                <p className="text-red-500 text-xs mt-1">{errors.invSuffix || errors.numero_inventario}</p>
              )}
            </div>

            {/* N° Serie — sin espacios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Serie *</label>
              <input
                type="text"
                required
                value={form.numero_serie}
                onChange={(e) => {
                  // Eliminar espacios automáticamente al tipear
                  const val = e.target.value.replace(/\s/g, "");
                  setForm({ ...form, numero_serie: val });
                }}
                placeholder="Sin espacios"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
              {errors.numero_serie && <p className="text-red-500 text-xs mt-1">{errors.numero_serie}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Equipo *</label>
              <select value={form.tipo_equipo} onChange={(e) => setForm({ ...form, tipo_equipo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {errors.tipo_equipo && <p className="text-red-500 text-xs mt-1">{errors.tipo_equipo}</p>}
            </div>
            <Sel label="Marca" name="marca" options={marcas} display={(o) => o.nombre} />
            <Sel label="Modelo" name="modelo" options={filteredModelos} display={(o) => o.nombre} />
            <Sel label="Procesador" name="procesador" options={procesadores} display={(o) => o.nombre} />
            <Sel label="RAM" name="ram" options={rams} display={(o) => o.capacidad} />
            {/* numero_sticks_ram eliminado — no es necesario registrarlo */}
            <Sel label="Almacenamiento" name="almacenamiento" options={almacenamientos} display={(o) => o.capacidad} />
            <Sel label="Sistema Operativo" name="sistema_operativo" options={sistemasOperativos} display={(o) => o.nombre} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required>
                {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              {errors.estado && <p className="text-red-500 text-xs mt-1">{errors.estado}</p>}
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="en_inventario" checked={form.en_inventario}
                onChange={(e) => setForm({ ...form, en_inventario: e.target.checked })}
                className="w-4 h-4 border rounded text-blue-600 focus:ring-2 focus:ring-blue-500" />
              <label htmlFor="en_inventario" className="text-sm font-medium text-gray-700">En Inventario</label>
            </div>
            <Sel label="Asignar a empleado" name="empleado_asignado" options={empleados} display={(o) => `${o.nombre_completo} — ${o.area_nombre}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios</label>
            <textarea value={form.accesorios} onChange={(e) => setForm({ ...form, accesorios: e.target.value })} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            {errors.accesorios && <p className="text-red-500 text-xs mt-1">{errors.accesorios}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
            <textarea value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            {errors.comentario && <p className="text-red-500 text-xs mt-1">{errors.comentario}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            {errors.notas && <p className="text-red-500 text-xs mt-1">{errors.notas}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editId ? "Actualizar" : "Crear"}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar */}
      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">¿Estás seguro de eliminar este computador? No se puede deshacer.</p>
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
