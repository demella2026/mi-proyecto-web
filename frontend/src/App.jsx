import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Computadores from "./pages/Computadores";
import Celulares from "./pages/Celulares";
import Monitores from "./pages/Monitores";
import Catalogos from "./pages/Catalogos";
import Empleados from "./pages/Empleados";
import CentrosCosto from "./pages/CentrosCosto";
import Chips from "./pages/Chips";
import Historial from "./pages/Historial";
import Mantenimiento from "./pages/Mantenimiento";
import Actas from "./pages/Actas";
import LdapSync from "./pages/LdapSync";
import Usuarios from "./pages/Usuarios";
import SolicitudesCorreo from "./pages/SolicitudesCorreo";

/** Redirige a /login si no hay sesión activa. */
function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/"               element={<Dashboard />} />
        <Route path="/computadores"   element={<Computadores />} />
        <Route path="/celulares"      element={<Celulares />} />
        <Route path="/monitores"      element={<Monitores />} />
        <Route path="/chips"          element={<Chips />} />
        <Route path="/mantenimiento"  element={<Mantenimiento />} />
        <Route path="/actas"          element={<Actas />} />
        <Route path="/historial"      element={<Historial />} />
        {/* Admin only (Layout oculta el nav, pero la ruta sigue activa si se accede directamente) */}
        <Route path="/catalogos"      element={<Catalogos />} />
        <Route path="/empleados"      element={<Empleados />} />
        <Route path="/centros-costo"  element={<CentrosCosto />} />
        <Route path="/usuarios"       element={<Usuarios />} />
        <Route path="/ldap"               element={<LdapSync />} />
        <Route path="/solicitudes-correo" element={<SolicitudesCorreo />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
