/** URL base de la API. Nginx en el contenedor frontend redirige /api/v1/* al backend Django. */
const BASE = "/api/v1";

/**
 * Intenta renovar el access token enviando el refresh token al endpoint /auth/refresh/.
 * Si el servidor responde con un nuevo access token lo guarda en localStorage y lo retorna.
 * Retorna null si no hay refresh token guardado o si la solicitud falla.
 */
async function tryRefresh() {
  const refresh = localStorage.getItem("inv_refresh");
  if (!refresh) return null;
  const res = await fetch(`${BASE}/auth/refresh/`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem("inv_access", data.access);
  if (data.refresh) localStorage.setItem("inv_refresh", data.refresh);
  return data.access;
}

/**
 * Función central de fetch que maneja autenticación JWT automáticamente.
 * - Adjunta el Bearer token del localStorage a cada solicitud.
 * - Si recibe 401 intenta renovar el token con tryRefresh() una sola vez (_retry flag).
 *   Si el refresh falla, limpia el localStorage y redirige a /login.
 * - En caso de error HTTP lanza un objeto { status, data } para que los handlers
 *   del formulario puedan mostrar errores de validación del backend.
 * - Retorna null para respuestas 204 (delete/sin contenido).
 * - Retorna Blob para respuestas Excel/PDF (para descargar archivos).
 * - Retorna el JSON parseado para el resto de respuestas.
 */
async function request(url, opts = {}, _retry = true) {
  const token = localStorage.getItem("inv_access");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };
  const res = await fetch(`${BASE}${url}`, { ...opts, headers });

  // Token expirado — intentar refresh una sola vez
  if (res.status === 401 && _retry) {
    const newToken = await tryRefresh();
    if (newToken) return request(url, opts, false);
    // Refresh falló → redirigir a login
    localStorage.removeItem("inv_access");
    localStorage.removeItem("inv_refresh");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, data: err };
  }
  if (res.status === 204) return null;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("spreadsheet") || ct.includes("pdf")) return res.blob();
  return res.json();
}

const api = {
  // Métodos genéricos (compatibles con axios-style: api.get(url), api.post(url, data), etc.)
  get:    (url, opts = {})       => request(url, { method: "GET",    ...opts }),
  post:   (url, data, opts = {}) => request(url, { method: "POST",   body: JSON.stringify(data), ...opts }),
  patch:  (url, data, opts = {}) => request(url, { method: "PATCH",  body: JSON.stringify(data), ...opts }),
  put:    (url, data, opts = {}) => request(url, { method: "PUT",    body: JSON.stringify(data), ...opts }),
  delete: (url)                  => request(url, { method: "DELETE" }),

  // Dashboard
  dashboard: () => request("/dashboard/"),

  // Catalogos
  getMarcas: () => request("/marcas/"),
  getMarcasPorTipo: (tipo) => request(`/marcas/?tipo_equipo=${tipo}`),
  createMarca: (d) => request("/marcas/", { method: "POST", body: JSON.stringify(d) }),
  updateMarca: (id, d) => request(`/marcas/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteMarca: (id) => request(`/marcas/${id}/`, { method: "DELETE" }),

  getModelos: () => request("/modelos/"),
  getModelosPorTipo: (tipo) => request(`/modelos/?tipo_equipo=${tipo}`),
  createModelo: (d) => request("/modelos/", { method: "POST", body: JSON.stringify(d) }),
  updateModelo: (id, d) => request(`/modelos/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteModelo: (id) => request(`/modelos/${id}/`, { method: "DELETE" }),

  getProcesadores: () => request("/procesadores/"),
  createProcesador: (d) => request("/procesadores/", { method: "POST", body: JSON.stringify(d) }),
  updateProcesador: (id, d) => request(`/procesadores/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteProcesador: (id) => request(`/procesadores/${id}/`, { method: "DELETE" }),

  getRam: () => request("/ram/"),
  createRam: (d) => request("/ram/", { method: "POST", body: JSON.stringify(d) }),
  updateRam: (id, d) => request(`/ram/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteRam: (id) => request(`/ram/${id}/`, { method: "DELETE" }),

  getAlmacenamientos: () => request("/almacenamientos/"),
  createAlmacenamiento: (d) => request("/almacenamientos/", { method: "POST", body: JSON.stringify(d) }),
  updateAlmacenamiento: (id, d) => request(`/almacenamientos/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteAlmacenamiento: (id) => request(`/almacenamientos/${id}/`, { method: "DELETE" }),

  getSistemasOperativos: () => request("/sistemas-operativos/"),
  createSistemaOperativo: (d) => request("/sistemas-operativos/", { method: "POST", body: JSON.stringify(d) }),
  updateSistemaOperativo: (id, d) => request(`/sistemas-operativos/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteSistemaOperativo: (id) => request(`/sistemas-operativos/${id}/`, { method: "DELETE" }),

  getSoftware: () => request("/software/"),
  createSoftware: (d) => request("/software/", { method: "POST", body: JSON.stringify(d) }),
  updateSoftware: (id, d) => request(`/software/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteSoftware: (id) => request(`/software/${id}/`, { method: "DELETE" }),

  // Areas y empleados
  getAreas: () => request("/areas/"),
  createArea: (d) => request("/areas/", { method: "POST", body: JSON.stringify(d) }),
  updateArea: (id, d) => request(`/areas/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteArea: (id) => request(`/areas/${id}/`, { method: "DELETE" }),

  getCentrosCosto: (q = "") => request(`/centros-costo/${q ? "?" + q : ""}`),
  createCentroCosto: (d) => request("/centros-costo/", { method: "POST", body: JSON.stringify(d) }),
  updateCentroCosto: (id, d) => request(`/centros-costo/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteCentroCosto: (id) => request(`/centros-costo/${id}/`, { method: "DELETE" }),
  getCentroCostoResumen: (id) => request(`/centros-costo/${id}/resumen/`),
  getCentroCostoMovimientos: (id) => request(`/centros-costo/${id}/movimientos/`),

  getEmpleados: (q = "") => request(`/empleados/${q ? "?" + q : ""}`),
  createEmpleado: (d) => request("/empleados/", { method: "POST", body: JSON.stringify(d) }),
  updateEmpleado: (id, d) => request(`/empleados/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteEmpleado: (id) => request(`/empleados/${id}/`, { method: "DELETE" }),

  // Chips / SIM
  getChips: (q = "") => request(`/chips/${q ? "?" + q : ""}`),
  createChip: (d) => request("/chips/", { method: "POST", body: JSON.stringify(d) }),
  updateChip: (id, d) => request(`/chips/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteChip: (id) => request(`/chips/${id}/`, { method: "DELETE" }),

  // Computadores
  getComputadores: (q = "") => request(`/computadores/${q ? "?" + q : ""}`),
  getComputadoresConEmpleado: () => request("/computadores/?con_empleado=true&page_size=200"),
  createComputador: (d) => request("/computadores/", { method: "POST", body: JSON.stringify(d) }),
  updateComputador: (id, d) => request(`/computadores/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteComputador: (id) => request(`/computadores/${id}/`, { method: "DELETE" }),
  computadorHistorial: (id) => request(`/computadores/${id}/historial/`),
  computadoresExcel: () => request("/computadores/exportar-excel/"),
  computadoresPdf: () => request("/computadores/exportar-pdf/"),

  // Celulares
  getCelulares: (q = "") => request(`/celulares/${q ? "?" + q : ""}`),
  getCelularesConEmpleado: () => request("/celulares/?con_empleado=true&page_size=200"),
  createCelular: (d) => request("/celulares/", { method: "POST", body: JSON.stringify(d) }),
  updateCelular: (id, d) => request(`/celulares/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteCelular: (id) => request(`/celulares/${id}/`, { method: "DELETE" }),
  celularHistorial: (id) => request(`/celulares/${id}/historial/`),
  celularesExcel: () => request("/celulares/exportar-excel/"),
  celularesPdf: () => request("/celulares/exportar-pdf/"),

  // Monitores
  getMonitores: (q = "") => request(`/monitores/${q ? "?" + q : ""}`),
  createMonitor: (d) => request("/monitores/", { method: "POST", body: JSON.stringify(d) }),
  updateMonitor: (id, d) => request(`/monitores/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteMonitor: (id) => request(`/monitores/${id}/`, { method: "DELETE" }),
  monitoresExcel: () => request("/monitores/exportar-excel/"),

  // Software instalado
  getComputadorSoftware: (q = "") => request(`/computador-software/${q ? "?" + q : ""}`),
  createComputadorSoftware: (d) => request("/computador-software/", { method: "POST", body: JSON.stringify(d) }),
  updateComputadorSoftware: (id, d) => request(`/computador-software/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteComputadorSoftware: (id) => request(`/computador-software/${id}/`, { method: "DELETE" }),

  // Historial global
  historial: (tipo) => request(`/historial/${tipo ? "?tipo=" + tipo : ""}`),

  // Mantenimiento (Bitacora Tecnica)
  getMantenimientos: (q = "") => request(`/mantenimiento/mantenimientos/${q ? "?" + q : ""}`),
  getMantenimiento: (id) => request(`/mantenimiento/mantenimientos/${id}/`),
  createMantenimiento: (d) => request("/mantenimiento/mantenimientos/", { method: "POST", body: JSON.stringify(d) }),
  updateMantenimiento: (id, d) => request(`/mantenimiento/mantenimientos/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  deleteMantenimiento: (id) => request(`/mantenimiento/mantenimientos/${id}/`, { method: "DELETE" }),
  mantenimientoPorEquipo: (tipo, id) => request(`/mantenimiento/mantenimientos/por-equipo/${tipo}/${id}/`),
  resumenCostos: () => request("/mantenimiento/mantenimientos/resumen-costos/"),
  subirArchivoMantenimiento: (id, formData) => {
    return fetch(`${BASE}/mantenimiento/mantenimientos/${id}/subir-archivo/`, {
      method: "POST",
      body: formData,
    }).then(r => { if (!r.ok) throw r; return r.json(); });
  },

  // Actas de Entrega
  getActas: (q = "") => request(`/actas/actas/${q ? "?" + q : ""}`),
  getActa: (id) => request(`/actas/actas/${id}/`),
  createActa: (d) => request("/actas/actas/", { method: "POST", body: JSON.stringify(d) }),
  updateActa: (id, d) => request(`/actas/actas/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  firmarActa: (id, d) => request(`/actas/actas/${id}/firmar/`, { method: "POST", body: JSON.stringify(d) }),
  firmaDigitalActa: (id, d) => request(`/actas/actas/${id}/firma-digital/`, { method: "POST", body: JSON.stringify(d) }),
  anularActa: (id) => request(`/actas/actas/${id}/anular/`, { method: "POST" }),
  descargarPdfActa: (id) => request(`/actas/actas/${id}/descargar-pdf/`),
  regenerarPdfActa: (id) => request(`/actas/actas/${id}/regenerar-pdf/`, { method: "POST" }),
  enviarActaEmail: (id, d) => request(`/actas/actas/${id}/enviar-email/`, { method: "POST", body: JSON.stringify(d || {}) }),
  actasPorEquipo: (tipo, id) => request(`/actas/actas/por-equipo/${tipo}/${id}/`),

  // Usuarios
  getUsuarios: (q = "") => request(`/usuarios/${q ? "?" + q : ""}`),
  createUsuario: (d) => request("/usuarios/", { method: "POST", body: JSON.stringify(d) }),
  updateUsuario: (id, d) => request(`/usuarios/${id}/`, { method: "PATCH", body: JSON.stringify(d) }),
  deleteUsuario: (id) => request(`/usuarios/${id}/`, { method: "DELETE" }),

  // LDAP Sync
  ldapStatus: () => request("/ldap/sync/status/"),
  ldapSyncLogs: () => request("/ldap/sync-logs/"),
  ldapTriggerSync: (d) => request("/ldap/sync/trigger/", { method: "POST", body: JSON.stringify(d || {}) }),
  ldapMappings: () => request("/ldap/ldap-mappings/"),
  createLdapMapping: (d) => request("/ldap/ldap-mappings/", { method: "POST", body: JSON.stringify(d) }),
  updateLdapMapping: (id, d) => request(`/ldap/ldap-mappings/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteLdapMapping: (id) => request(`/ldap/ldap-mappings/${id}/`, { method: "DELETE" }),
};

export default api;

/**
 * Dispara la descarga de un Blob en el navegador sin abrir una nueva pestaña.
 * Crea un enlace <a> temporal, lo hace clic programáticamente y lo elimina.
 * Libera la URL de objeto después de la descarga para evitar memory leaks.
 * @param {Blob} blob - Contenido del archivo a descargar (Excel, PDF, etc.)
 * @param {string} name - Nombre sugerido para el archivo descargado
 */
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
