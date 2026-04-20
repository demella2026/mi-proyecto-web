import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Laptop, Smartphone, Monitor } from "lucide-react";
import Modal from "../components/Modal";
import api from "../api";

// ── Definición de sectores y sus pestañas ────────────────────────
const TIPO_ALMACENAMIENTO = [
  { value: "SSD",  label: "SSD"  },
  { value: "HDD",  label: "HDD"  },
  { value: "NVME", label: "NVMe" },
  { value: "EMMC", label: "eMMC" },
];

// Tabs que dependen del sector para marcas/modelos (se construyen dinámicamente)
const tabMarcas = (tipo) => ({
  key: "marcas",
  label: "Marcas",
  tipo,
  cols: ["nombre"],
  colLabels: ["Nombre"],
  fields: [{ name: "nombre", label: "Nombre de la marca", type: "text" }],
  getFn: () => api.getMarcasPorTipo(tipo),
  createFn: api.createMarca,
  updateFn: api.updateMarca,
  delFn: api.deleteMarca,
});

const tabModelos = (tipo) => ({
  key: "modelos",
  label: "Modelos",
  tipo,
  cols: ["marca_nombre", "nombre"],
  colLabels: ["Marca", "Modelo"],
  fields: [
    { name: "marca",  label: "Marca",  type: "select", optionsKey: "marcas_all", display: (o) => o.nombre },
    { name: "nombre", label: "Nombre del modelo", type: "text" },
    // tipo_equipo se inyecta automáticamente según el sector
  ],
  getFn: () => api.getModelosPorTipo(tipo),
  createFn: (d) => api.createModelo({ ...d, tipo_equipo: tipo }),
  updateFn: (id, d) => api.updateModelo(id, { ...d, tipo_equipo: tipo }),
  delFn: api.deleteModelo,
});

const tabProcesadores = {
  key: "procesadores", label: "Procesadores",
  cols: ["nombre"], colLabels: ["Nombre"],
  fields: [{ name: "nombre", label: "Nombre (ej: Intel Core i5-1335U)", type: "text" }],
  getFn: api.getProcesadores, createFn: api.createProcesador,
  updateFn: api.updateProcesador, delFn: api.deleteProcesador,
};

const tabRam = {
  key: "ram", label: "Memorias RAM",
  cols: ["capacidad", "part_number"], colLabels: ["Capacidad", "Part Number"],
  fields: [
    { name: "capacidad",   label: "Capacidad (ej: 16 GB DDR4)", type: "text" },
    { name: "part_number", label: "Part Number",                 type: "text", required: false },
  ],
  getFn: api.getRam, createFn: api.createRam,
  updateFn: api.updateRam, delFn: api.deleteRam,
};

const tabAlmacenamiento = {
  key: "almacenamientos", label: "Almacenamiento",
  cols: ["tipo", "capacidad", "nombre_modelo"], colLabels: ["Tipo", "Capacidad", "Modelo de disco"],
  fields: [
    { name: "tipo",         label: "Tipo",                   type: "select_static", options: TIPO_ALMACENAMIENTO },
    { name: "capacidad",    label: "Capacidad (ej: 512 GB)", type: "text" },
    { name: "nombre_modelo",label: "Modelo de disco",        type: "text", required: false },
  ],
  getFn: api.getAlmacenamientos, createFn: api.createAlmacenamiento,
  updateFn: api.updateAlmacenamiento, delFn: api.deleteAlmacenamiento,
};

const tabSO = {
  key: "sistemas_operativos", label: "Sistemas Operativos",
  cols: ["nombre"], colLabels: ["Sistema Operativo"],
  fields: [{ name: "nombre", label: "Nombre (ej: Windows 11 Pro)", type: "text" }],
  getFn: api.getSistemasOperativos, createFn: api.createSistemaOperativo,
  updateFn: api.updateSistemaOperativo, delFn: api.deleteSistemaOperativo,
};

const tabSoftware = {
  key: "software", label: "Software",
  cols: ["nombre", "fabricante"], colLabels: ["Software", "Fabricante"],
  fields: [
    { name: "nombre",     label: "Nombre (ej: AutoCAD 2024)", type: "text" },
    { name: "fabricante", label: "Fabricante",                type: "text", required: false },
  ],
  getFn: api.getSoftware, createFn: api.createSoftware,
  updateFn: api.updateSoftware, delFn: api.deleteSoftware,
};

const SECTORS = [
  {
    key: "COMPUTADOR",
    label: "Computadores",
    Icon: Laptop,
    color: "blue",
    bg: "bg-blue-600",
    bgLight: "bg-blue-50",
    border: "border-blue-200",
    ring: "focus:ring-blue-500",
    tabs: [
      tabMarcas("COMPUTADOR"),
      tabModelos("COMPUTADOR"),
      tabProcesadores,
      tabRam,
      tabAlmacenamiento,
      tabSO,
      tabSoftware,
    ],
  },
  {
    key: "CELULAR",
    label: "Celulares",
    Icon: Smartphone,
    color: "green",
    bg: "bg-emerald-600",
    bgLight: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "focus:ring-emerald-500",
    tabs: [
      tabMarcas("CELULAR"),
      tabModelos("CELULAR"),
      tabRam,
      tabAlmacenamiento,
    ],
  },
  {
    key: "MONITOR",
    label: "Monitores",
    Icon: Monitor,
    color: "purple",
    bg: "bg-purple-600",
    bgLight: "bg-purple-50",
    border: "border-purple-200",
    ring: "focus:ring-purple-500",
    tabs: [
      tabMarcas("MONITOR"),
      tabModelos("MONITOR"),
    ],
  },
];

// ── Componente principal ─────────────────────────────────────────
export default function Catalogos() {
  const [sector, setSector]     = useState("COMPUTADOR");
  const [tabKey, setTabKey]     = useState("marcas");
  const [data, setData]         = useState({});
  const [marcasAll, setMarcasAll] = useState([]);  // para selector de modelos
  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState({});
  const [errors, setErrors]     = useState({});
  const [delId, setDelId]       = useState(null);

  const currentSector = SECTORS.find((s) => s.key === sector);
  const currentTab    = currentSector.tabs.find((t) => t.key === tabKey)
                     || currentSector.tabs[0];

  // Si al cambiar sector el tab actual no existe, ir al primero
  const handleSector = (key) => {
    setSector(key);
    const sec = SECTORS.find((s) => s.key === key);
    const exists = sec.tabs.find((t) => t.key === tabKey);
    if (!exists) setTabKey(sec.tabs[0].key);
  };

  const cacheKey = `${sector}__${currentTab.key}`;

  const fetchTab = useCallback(async () => {
    const d = await currentTab.getFn().catch(() => []);
    setData((prev) => ({ ...prev, [cacheKey]: Array.isArray(d) ? d : d.results || [] }));
  }, [cacheKey]); // eslint-disable-line

  useEffect(() => { fetchTab(); }, [fetchTab]);

  // Cargar todas las marcas para el selector de modelos
  useEffect(() => {
    api.getMarcas().then(setMarcasAll).catch(() => {});
  }, []);

  const rows = data[cacheKey] || [];
  const optionsMap = { marcas_all: marcasAll };

  const openCreate = () => {
    setEditId(null);
    const f = {};
    currentTab.fields.forEach((fi) => (f[fi.name] = ""));
    setForm(f); setErrors({}); setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    const f = {};
    currentTab.fields.forEach((fi) => (f[fi.name] = row[fi.name] ?? ""));
    setForm(f); setErrors({}); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    try {
      if (editId) {
        await currentTab.updateFn(editId, form);
      } else {
        await currentTab.createFn(form);
      }
      setModal(false);
      fetchTab();
      // Refrescar lista de todas las marcas si se modificaron
      if (currentTab.key === "marcas") {
        api.getMarcas().then(setMarcasAll).catch(() => {});
      }
    } catch (err) {
      if (err.data) setErrors(err.data);
    }
  };

  const confirmDel = async () => {
    await currentTab.delFn(delId).catch(console.error);
    setDelId(null); fetchTab();
  };

  const { bg, bgLight, border, ring } = currentSector;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Catálogos</h2>

      {/* ── Selector de sector ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {SECTORS.map(({ key, label, Icon, bg: sbg, bgLight: sbl, border: sbr }) => (
          <button key={key} onClick={() => handleSector(key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all
              ${sector === key
                ? `${sbg} text-white border-transparent shadow-md`
                : `bg-white ${sbl} ${sbr} text-gray-700 hover:shadow-sm`}`}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tabs del sector activo ────────────────────────── */}
      <div className={`flex flex-wrap gap-1 mb-4 rounded-xl shadow-sm border p-1 ${bgLight} ${border}`}>
        {currentSector.tabs.map((t) => (
          <button key={t.key} onClick={() => setTabKey(t.key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors
              ${tabKey === t.key ? `${bg} text-white` : "text-gray-600 hover:bg-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tabla ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-gray-800">
            {currentTab.label}
            <span className="ml-2 text-sm font-normal text-gray-400">({rows.length} registros)</span>
          </span>
          <button onClick={openCreate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${bg} text-white rounded-lg hover:opacity-90`}>
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 w-14">ID</th>
                {currentTab.colLabels.map((l) => (
                  <th key={l} className="text-left px-4 py-3 font-semibold text-gray-500">{l}</th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-gray-500 w-20">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={currentTab.cols.length + 2} className="text-center py-10 text-gray-400">
                    Sin registros en esta categoría
                  </td>
                </tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.id}</td>
                  {currentTab.cols.map((c) => (
                    <td key={c} className="px-4 py-3">{r[c] ?? "—"}</td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDelId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Crear/Editar ────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? `Editar ${currentTab.label}` : `Nuevo — ${currentTab.label}`}>
        <form onSubmit={submit} className="space-y-4">
          {currentTab.fields.map((fi) => (
            <div key={fi.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {fi.label}{fi.required !== false && " *"}
              </label>
              {fi.type === "select" ? (
                <select value={form[fi.name] || ""}
                  onChange={(e) => setForm({ ...form, [fi.name]: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${ring}`}
                  required>
                  <option value="">Seleccionar…</option>
                  {(optionsMap[fi.optionsKey] || []).map((o) => (
                    <option key={o.id} value={o.id}>{fi.display(o)}</option>
                  ))}
                </select>
              ) : fi.type === "select_static" ? (
                <select value={form[fi.name] || ""}
                  onChange={(e) => setForm({ ...form, [fi.name]: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${ring}`}
                  required>
                  <option value="">Seleccionar…</option>
                  {fi.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={form[fi.name] || ""}
                  onChange={(e) => setForm({ ...form, [fi.name]: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${ring}`}
                  required={fi.required !== false} />
              )}
              {errors[fi.name] && <p className="text-red-500 text-xs mt-1">{errors[fi.name]}</p>}
            </div>
          ))}
          {/* Nota de sector para modelos */}
          {currentTab.key === "modelos" && (
            <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
              El modelo se guardará automáticamente en la categoría <strong>{currentSector.label}</strong>.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModal(false)}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit"
              className={`px-4 py-2 text-sm text-white ${bg} rounded-lg hover:opacity-90`}>
              {editId ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Eliminar ────────────────────────────────── */}
      <Modal open={!!delId} onClose={() => setDelId(null)} title="Confirmar Eliminación">
        <p className="text-gray-600 mb-6">
          ¿Eliminar este registro? Si tiene equipos asociados, la operación fallará.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDelId(null)}
            className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={confirmDel}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
