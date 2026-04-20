import React, { useState, useEffect } from "react";
import { RefreshCw, Server, CheckCircle, AlertTriangle, XCircle, Play, Settings } from "lucide-react";
import api from "../api";
import Modal from "../components/Modal";

const estadoIcon = {
  exitoso: <CheckCircle className="w-4 h-4 text-green-600" />,
  parcial: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
  fallido: <XCircle className="w-4 h-4 text-red-600" />,
};
const estadoColor = {
  exitoso: "bg-green-100 text-green-800",
  parcial: "bg-yellow-100 text-yellow-800",
  fallido: "bg-red-100 text-red-800",
};

export default function LdapSync() {
  const [statusData, setStatusData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncOutput, setSyncOutput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [showMappings, setShowMappings] = useState(false);

  // Mapping form
  const [mapForm, setMapForm] = useState({ atributo_ldap: "", campo_empleado: "", activo: true });
  const [editingMap, setEditingMap] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [st, lg, mp] = await Promise.all([
        api.ldapStatus(),
        api.ldapSyncLogs().then(r => r.results || r).catch(() => []),
        api.ldapMappings().catch(() => []),
      ]);
      setStatusData(st);
      setLogs(lg);
      setMappings(mp);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function triggerSync(dryRun = false) {
    setSyncing(true);
    setSyncOutput("");
    try {
      const res = await api.ldapTriggerSync({ dry_run: dryRun, desactivar_ausentes: true });
      setSyncOutput(res.output || "Sincronizacion completada.");
      setShowOutput(true);
      load();
    } catch (e) {
      setSyncOutput(e.data?.error || e.data?.output || "Error al ejecutar sincronizacion.");
      setShowOutput(true);
    }
    setSyncing(false);
  }

  async function saveMapping(e) {
    e.preventDefault();
    try {
      if (editingMap) {
        await api.updateLdapMapping(editingMap.id, mapForm);
      } else {
        await api.createLdapMapping(mapForm);
      }
      setMapForm({ atributo_ldap: "", campo_empleado: "", activo: true });
      setEditingMap(null);
      load();
    } catch (e) { alert("Error: " + JSON.stringify(e.data || e)); }
  }

  async function deleteMapping(id) {
    if (!confirm("Eliminar este mapeo?")) return;
    await api.deleteLdapMapping(id);
    load();
  }

  if (loading) return <p className="p-8 text-center text-gray-500">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-7 h-7 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Sincronizacion LDAP / Active Directory</h2>
        </div>
      </div>

      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Estado del Servidor</h3>
          </div>
          {statusData?.ldap_habilitado ? (
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <CheckCircle className="w-3 h-3" /> Configurado
              </span>
              <p className="text-xs text-gray-500 mt-2">{statusData.servidor}</p>
            </div>
          ) : (
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                <AlertTriangle className="w-3 h-3" /> No configurado
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Configura las variables LDAP_SERVER_URI, LDAP_BIND_DN y LDAP_BIND_PASSWORD en tu archivo .env
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Ultima Sincronizacion</h3>
          </div>
          {statusData?.ultima_sincronizacion ? (
            <div>
              <div className="flex items-center gap-2">
                {estadoIcon[statusData.ultima_sincronizacion.estado]}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[statusData.ultima_sincronizacion.estado]}`}>
                  {statusData.ultima_sincronizacion.estado_display}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(statusData.ultima_sincronizacion.fecha).toLocaleString("es-CO")}
              </p>
              <div className="text-xs mt-1">
                <span className="text-green-600">+{statusData.ultima_sincronizacion.empleados_creados}</span>
                {" / "}
                <span className="text-blue-600">~{statusData.ultima_sincronizacion.empleados_actualizados}</span>
                {" / "}
                <span className="text-red-600">-{statusData.ultima_sincronizacion.empleados_desactivados}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nunca se ha ejecutado</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Acciones</h3>
          </div>
          <div className="space-y-2">
            <button onClick={() => triggerSync(true)} disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Simular (Dry Run)
            </button>
            <button onClick={() => triggerSync(false)} disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar Ahora
            </button>
            <button onClick={() => setShowMappings(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <Settings className="w-4 h-4" /> Mapeos de Atributos
            </button>
          </div>
        </div>
      </div>

      {/* Historial de sincronizaciones */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-sm text-gray-700">Historial de Sincronizaciones</h3>
        </div>
        {logs.length === 0 ? (
          <p className="p-8 text-center text-gray-400">No hay registros de sincronizacion.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-center">Creados</th>
                <th className="px-4 py-3 text-center">Actualizados</th>
                <th className="px-4 py-3 text-center">Desactivados</th>
                <th className="px-4 py-3 text-right">Duracion</th>
                <th className="px-4 py-3 text-left">Ejecutado por</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">{new Date(log.fecha).toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {estadoIcon[log.estado]}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[log.estado]}`}>
                        {log.estado_display}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-green-600">+{log.empleados_creados}</td>
                  <td className="px-4 py-3 text-center font-medium text-blue-600">~{log.empleados_actualizados}</td>
                  <td className="px-4 py-3 text-center font-medium text-red-600">-{log.empleados_desactivados}</td>
                  <td className="px-4 py-3 text-right text-xs">{log.duracion_segundos.toFixed(1)}s</td>
                  <td className="px-4 py-3 text-xs">{log.ejecutado_por}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de output */}
      <Modal open={showOutput} onClose={() => setShowOutput(false)} title="Resultado de Sincronizacion" wide>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap">
          {syncOutput}
        </pre>
      </Modal>

      {/* Modal de mapeos */}
      <Modal open={showMappings} onClose={() => setShowMappings(false)} title="Mapeos de Atributos LDAP" wide>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Define la correspondencia entre atributos de Active Directory y campos del modelo Empleado.
          </p>
          <form onSubmit={saveMapping} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium">Atributo LDAP</label>
              <input value={mapForm.atributo_ldap} onChange={e => setMapForm({ ...mapForm, atributo_ldap: e.target.value })}
                required placeholder="ej: sAMAccountName" className="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium">Campo Empleado</label>
              <input value={mapForm.campo_empleado} onChange={e => setMapForm({ ...mapForm, campo_empleado: e.target.value })}
                required placeholder="ej: nombre" className="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
              {editingMap ? "Actualizar" : "Agregar"}
            </button>
          </form>
          {mappings.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs"><tr>
                <th className="px-3 py-2 text-left">Atributo LDAP</th>
                <th className="px-3 py-2 text-left">Campo Empleado</th>
                <th className="px-3 py-2 text-center">Activo</th>
                <th className="px-3 py-2 text-center">Acciones</th>
              </tr></thead>
              <tbody className="divide-y">
                {mappings.map(m => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-mono text-xs">{m.atributo_ldap}</td>
                    <td className="px-3 py-2">{m.campo_empleado}</td>
                    <td className="px-3 py-2 text-center">{m.activo ? "Si" : "No"}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => { setEditingMap(m); setMapForm(m); }} className="text-blue-600 text-xs mr-2">Editar</button>
                      <button onClick={() => deleteMapping(m.id)} className="text-red-600 text-xs">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Mapeos predeterminados (hardcoded)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><code>sAMAccountName</code> &rarr; <code>username</code></div>
              <div><code>displayName</code> &rarr; <code>nombre</code></div>
              <div><code>mail</code> &rarr; <code>email</code></div>
              <div><code>title</code> &rarr; <code>cargo</code></div>
              <div><code>department</code> &rarr; <code>area</code></div>
              <div><code>userAccountControl</code> &rarr; <code>activo</code></div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
