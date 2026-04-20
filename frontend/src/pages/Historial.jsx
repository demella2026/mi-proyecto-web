import React, { useState, useEffect } from "react";
import { History, Filter } from "lucide-react";
import api from "../api";

export default function Historial() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    setLoading(true);
    api.historial(filtro)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filtro]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6" /> Historial de Cambios
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Todos</option>
            <option value="computador">Computadores</option>
            <option value="celular">Celulares</option>
            <option value="monitor">Monitores</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-500">Cargando…</p>
      ) : data.length === 0 ? (
        <p className="text-center py-12 text-gray-500">No hay registros de cambios aún.</p>
      ) : (
        <div className="space-y-3">
          {data.map((r, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold
                    ${r.tipo_equipo === "Computador" ? "bg-indigo-100 text-indigo-800"
                      : r.tipo_equipo === "Monitor" ? "bg-cyan-100 text-cyan-800"
                      : "bg-purple-100 text-purple-800"}`}>
                    {r.tipo_equipo}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium
                    ${r.tipo_cambio === "Creado" ? "bg-green-100 text-green-800"
                      : r.tipo_cambio === "Eliminado" ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"}`}>
                    {r.tipo_cambio}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{new Date(r.fecha).toLocaleString()}</span>
              </div>

              <p className="text-sm font-medium text-gray-800 mb-1">{r.equipo}</p>
              <p className="text-xs text-gray-500 mb-2">Por: {r.usuario}</p>

              {r.cambios?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {r.cambios.map((c, j) => (
                    <div key={j} className="text-xs bg-gray-50 rounded p-2 flex flex-wrap gap-1">
                      <span className="font-semibold text-gray-700">{c.campo}:</span>
                      <span className="text-red-500 line-through">{c.anterior}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 font-medium">{c.nuevo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}