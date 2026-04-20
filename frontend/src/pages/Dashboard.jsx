import React, { useState, useEffect } from "react";
import {
  Laptop, Smartphone, Users, AlertTriangle, Package,
  Building2, Monitor, Wifi, Wrench, ArrowDownCircle,
  CheckCircle2, Clock, XCircle, Archive,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "../api";

// ─── Paleta de colores ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  EN_USO:               "#22C55E",
  EN_BODEGA:            "#3B82F6",
  EN_REPARACION:        "#F59E0B",
  PENDIENTE_DEVOLUCION: "#F97316",
  DE_BAJA:              "#EF4444",
  SUSPENDIDA:           "#A855F7",
};
const STATUS_LABEL = {
  EN_USO: "En Uso", EN_BODEGA: "En Bodega",
  EN_REPARACION: "En Reparación", PENDIENTE_DEVOLUCION: "Pend. Devolución",
  DE_BAJA: "De Baja", SUSPENDIDA: "Suspendida",
};
const AREA_COLORS = ["#3B82F6","#6366F1","#8B5CF6","#EC4899","#F97316","#22C55E","#14B8A6","#F59E0B"];

// ─── Tooltip personalizado para pie ─────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{payload[0].value} equipos</p>
    </div>
  );
};

// ─── Tooltip personalizado para bar ─────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ─── Tarjeta KPI grande ───────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, gradient, textColor = "text-white" }) {
  return (
    <div className={`rounded-xl p-4 flex items-center gap-4 shadow-sm ${gradient}`}>
      <div className="bg-white/20 rounded-lg p-2.5 shrink-0">
        <Icon className={`w-5 h-5 ${textColor}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium opacity-80 ${textColor}`}>{label}</p>
        <p className={`text-3xl font-bold leading-none mt-0.5 ${textColor}`}>{value ?? "—"}</p>
        {sub && <p className={`text-xs opacity-70 mt-0.5 ${textColor}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tarjeta de estado compacta ───────────────────────────────────────────────
function StatusCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-none">{value ?? 0}</p>
      </div>
    </div>
  );
}

// ─── Mini donut chart ─────────────────────────────────────────────────────────
function MiniDonut({ title, data, total }) {
  const filtered = Object.entries(data).filter(([, v]) => v > 0);
  if (filtered.length === 0) return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">{title}</h3>
      <p className="text-center text-gray-400 text-xs mt-4">Sin datos</p>
    </div>
  );
  const pieData = filtered.map(([k, v]) => ({ name: STATUS_LABEL[k] || k, value: v, key: k }));
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{title}</h3>
      <div className="flex items-center gap-3 mt-1">
        <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} dataKey="value" strokeWidth={0}>
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#94A3B8"} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-gray-800 leading-none">{total}</span>
            <span className="text-[9px] text-gray-400 leading-none">total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {pieData.map((entry) => (
            <div key={entry.key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.key] || "#94A3B8" }} />
              <span className="text-xs text-gray-500 truncate flex-1">{entry.name}</span>
              <span className="text-xs font-semibold text-gray-700 shrink-0">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setS).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Cargando panel...</p>
      </div>
    </div>
  );
  if (!s) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-red-500 text-sm">Error al cargar los datos del panel.</p>
    </div>
  );

  // Datos del gráfico de área
  const areaData = (s.equipos_por_area || [])
    .filter((a) => a.area)
    .map((a) => ({
      name: a.area.length > 18 ? a.area.slice(0, 16) + "…" : a.area,
      fullName: a.area,
      Computadores: a.computadores,
      Celulares: a.celulares,
    }));

  const totalEquipos = s.total_equipos || 0;
  const pctEnUso = totalEquipos > 0 ? Math.round((s.total_en_uso / totalEquipos) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ── Encabezado ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Panel Principal</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resumen del inventario de activos TI — Elecnor Chile</p>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* ── KPIs principales ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Activos" value={s.total_equipos} sub={`${pctEnUso}% en uso`}
          icon={Package} gradient="bg-gradient-to-br from-blue-600 to-blue-800" />
        <KpiCard label="Empleados Activos" value={s.total_empleados} sub={`${s.total_areas} áreas`}
          icon={Users} gradient="bg-gradient-to-br from-violet-600 to-violet-800" />
        <KpiCard label="En Reparación" value={s.total_en_reparacion}
          sub={s.total_en_reparacion > 0 ? "Requieren atención" : "Todo operativo"}
          icon={Wrench} gradient={s.total_en_reparacion > 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-green-500 to-green-700"} />
        <KpiCard label="Pend. Devolución" value={s.total_pendiente_devolucion}
          sub={s.total_pendiente_devolucion > 0 ? "Pendientes de recuperar" : "Sin pendientes"}
          icon={ArrowDownCircle} gradient={s.total_pendiente_devolucion > 0 ? "bg-gradient-to-br from-orange-500 to-red-600" : "bg-gradient-to-br from-teal-500 to-teal-700"} />
      </div>

      {/* ── Estado global de equipos ────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado global de equipos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <StatusCard label="En Uso" value={s.total_en_uso} color={STATUS_COLORS.EN_USO} icon={CheckCircle2} />
          <StatusCard label="En Bodega" value={s.total_en_bodega} color={STATUS_COLORS.EN_BODEGA} icon={Archive} />
          <StatusCard label="En Reparación" value={s.total_en_reparacion} color={STATUS_COLORS.EN_REPARACION} icon={Wrench} />
          <StatusCard label="Pend. Devolución" value={s.total_pendiente_devolucion} color={STATUS_COLORS.PENDIENTE_DEVOLUCION} icon={Clock} />
          <StatusCard label="De Baja" value={s.total_de_baja} color={STATUS_COLORS.DE_BAJA} icon={XCircle} />
        </div>
      </div>

      {/* ── Inventario por tipo + Chips ─────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Inventario por tipo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg shrink-0"><Laptop className="w-4 h-4 text-indigo-600" /></div>
            <div><p className="text-xs text-gray-500">Computadores</p><p className="text-2xl font-bold text-gray-900 leading-none">{s.total_computadores}</p></div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg shrink-0"><Smartphone className="w-4 h-4 text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Celulares</p><p className="text-2xl font-bold text-gray-900 leading-none">{s.total_celulares}</p></div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3">
            <div className="bg-cyan-100 p-2 rounded-lg shrink-0"><Monitor className="w-4 h-4 text-cyan-600" /></div>
            <div><p className="text-xs text-gray-500">Monitores</p><p className="text-2xl font-bold text-gray-900 leading-none">{s.total_monitores}</p></div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg shrink-0"><Wifi className="w-4 h-4 text-teal-600" /></div>
            <div><p className="text-xs text-gray-500">Chips / SIM</p><p className="text-2xl font-bold text-gray-900 leading-none">{s.total_chips ?? 0}</p></div>
          </div>
        </div>
      </div>

      {/* ── Gráficos de estado por tipo ─────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distribución por estado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <MiniDonut title="Computadores" data={s.computadores_por_estado} total={s.total_computadores} />
          <MiniDonut title="Celulares" data={s.celulares_por_estado} total={s.total_celulares} />
          <MiniDonut title="Monitores" data={s.monitores_por_estado} total={s.total_monitores} />
          <MiniDonut title="Chips / SIM" data={s.chips_por_estado || {}} total={s.total_chips ?? 0} />
        </div>
      </div>

      {/* ── Gráficos inferiores ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Equipos por área */}
        {areaData.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Equipos asignados por área</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={areaData} layout="vertical" margin={{ left: 8, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<BarTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Computadores" stackId="a" fill="#6366F1" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Celulares" stackId="a" fill="#A855F7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Computadores por marca */}
        {s.computadores_por_marca?.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Computadores por marca</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s.computadores_por_marca.map((i) => ({ name: i.marca__nombre, cantidad: i.count }))}
                margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="cantidad" name="Computadores" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {s.computadores_por_marca.map((_, i) => (
                    <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Computadores por tipo */}
        {s.computadores_por_tipo?.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Computadores por tipo</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={s.computadores_por_tipo.map((t) => ({ name: t.tipo_equipo, cantidad: t.count }))}
                margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="cantidad" name="Cantidad" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Alertas / Resumen de atención */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Resumen de atención</h3>
          <div className="space-y-2.5">
            {[
              {
                label: "Equipos en reparación",
                value: s.total_en_reparacion,
                icon: Wrench,
                color: s.total_en_reparacion > 0 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-green-600 bg-green-50 border-green-200",
                desc: s.total_en_reparacion > 0 ? "Requieren seguimiento" : "Sin equipos en reparación",
              },
              {
                label: "Equipos pendiente devolución",
                value: s.total_pendiente_devolucion,
                icon: ArrowDownCircle,
                color: s.total_pendiente_devolucion > 0 ? "text-orange-600 bg-orange-50 border-orange-200" : "text-green-600 bg-green-50 border-green-200",
                desc: s.total_pendiente_devolucion > 0 ? "Pendientes de recuperar" : "Sin devoluciones pendientes",
              },
              {
                label: "Equipos en bodega (disponibles)",
                value: s.total_en_bodega,
                icon: Archive,
                color: "text-blue-600 bg-blue-50 border-blue-200",
                desc: "Listos para asignar",
              },
              {
                label: "Equipos dados de baja",
                value: s.total_de_baja,
                icon: XCircle,
                color: s.total_de_baja > 0 ? "text-red-600 bg-red-50 border-red-200" : "text-gray-500 bg-gray-50 border-gray-200",
                desc: s.total_de_baja > 0 ? "Dados de baja en el sistema" : "Sin equipos de baja",
              },
              {
                label: "Chips / SIM activos",
                value: (s.chips_por_estado || {})["EN_USO"] ?? 0,
                icon: Wifi,
                color: "text-teal-600 bg-teal-50 border-teal-200",
                desc: `de ${s.total_chips ?? 0} SIMs totales`,
              },
            ].map(({ label, value, icon: Icon, color, desc }) => (
              <div key={label} className={`flex items-center gap-3 p-2.5 rounded-lg border ${color}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-none">{label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{desc}</p>
                </div>
                <span className="text-lg font-bold leading-none shrink-0">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
