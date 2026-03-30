import React, { useState, useEffect } from "react";
import {
  Laptop, Smartphone, Users, AlertTriangle, Package, Building2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../api";

const COLORS = ["#3B82F6", "#F59E0B", "#EF4444"];
const LABEL = { activo: "Activo", en_reparacion: "En Reparación", de_baja: "De Baja" };

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setS).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-12 text-gray-500">Cargando…</p>;
  if (!s) return <p className="text-center py-12 text-red-500">Error al cargar datos</p>;

  const cards = [
    { l: "Total Equipos", v: s.total_equipos, icon: Package, c: "bg-blue-500" },
    { l: "Laptops", v: s.total_laptops, icon: Laptop, c: "bg-indigo-500" },
    { l: "Celulares", v: s.total_celulares, icon: Smartphone, c: "bg-purple-500" },
    { l: "Sin Asignar", v: s.equipos_sin_asignar, icon: AlertTriangle, c: "bg-amber-500" },
    { l: "Empleados", v: s.total_empleados, icon: Users, c: "bg-green-500" },
    { l: "Áreas", v: s.total_areas, icon: Building2, c: "bg-teal-500" },
  ];

  const pieData = (obj) => Object.entries(obj).map(([k, v]) => ({ name: LABEL[k], value: v }));
  const barData = (arr) => arr.map((i) => ({ name: i.marca__nombre, cantidad: i.count }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.l} className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
            <div className={`${c.c} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-sm text-gray-500">{c.l}</p>
              <p className="text-2xl font-bold">{c.v}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[{ title: "Laptops por Estado", data: pieData(s.laptops_por_estado) },
          { title: "Celulares por Estado", data: pieData(s.celulares_por_estado) }].map((ch) => (
          <div key={ch.title} className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">{ch.title}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={ch.data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  {ch.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}

        {s.laptops_por_marca.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4">Laptops por Marca</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData(s.laptops_por_marca)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}