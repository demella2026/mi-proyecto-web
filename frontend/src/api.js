const BASE = "/api/v1";

async function request(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });

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
  // Dashboard
  dashboard: () => request("/dashboard/"),

  // Catálogos
  getMarcas: () => request("/marcas/"),
  createMarca: (d) => request("/marcas/", { method: "POST", body: JSON.stringify(d) }),
  updateMarca: (id, d) => request(`/marcas/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteMarca: (id) => request(`/marcas/${id}/`, { method: "DELETE" }),

  getModelos: () => request("/modelos/"),
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

  // Áreas y empleados
  getAreas: () => request("/areas/"),
  createArea: (d) => request("/areas/", { method: "POST", body: JSON.stringify(d) }),
  updateArea: (id, d) => request(`/areas/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteArea: (id) => request(`/areas/${id}/`, { method: "DELETE" }),

  getEmpleados: () => request("/empleados/"),
  createEmpleado: (d) => request("/empleados/", { method: "POST", body: JSON.stringify(d) }),
  updateEmpleado: (id, d) => request(`/empleados/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteEmpleado: (id) => request(`/empleados/${id}/`, { method: "DELETE" }),

  // Laptops
  getLaptops: (q = "") => request(`/laptops/${q ? "?" + q : ""}`),
  createLaptop: (d) => request("/laptops/", { method: "POST", body: JSON.stringify(d) }),
  updateLaptop: (id, d) => request(`/laptops/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteLaptop: (id) => request(`/laptops/${id}/`, { method: "DELETE" }),
  laptopHistorial: (id) => request(`/laptops/${id}/historial/`),
  laptopsExcel: () => request("/laptops/exportar-excel/"),
  laptopsPdf: () => request("/laptops/exportar-pdf/"),

  // Celulares
  getCelulares: (q = "") => request(`/celulares/${q ? "?" + q : ""}`),
  createCelular: (d) => request("/celulares/", { method: "POST", body: JSON.stringify(d) }),
  updateCelular: (id, d) => request(`/celulares/${id}/`, { method: "PUT", body: JSON.stringify(d) }),
  deleteCelular: (id) => request(`/celulares/${id}/`, { method: "DELETE" }),
  celularHistorial: (id) => request(`/celulares/${id}/historial/`),
  celularesExcel: () => request("/celulares/exportar-excel/"),
  celularesPdf: () => request("/celulares/exportar-pdf/"),

  // Historial global
  historial: (tipo) => request(`/historial/${tipo ? "?tipo=" + tipo : ""}`),
};

export default api;

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}