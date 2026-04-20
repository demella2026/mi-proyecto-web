import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Laptop, Smartphone, Database,
  Users, History, Menu, X, Monitor,
  Wrench, FileText, Server, Banknote, Wifi, LogOut,
  ShieldCheck, HardHat, UserCog, Mail,
} from "lucide-react";
import { useAuth } from "../auth";

// Nav visible para TODOS los usuarios autenticados
const NAV_COMUN = [
  { to: "/",             label: "Dashboard",       icon: LayoutDashboard },
  { to: "/computadores", label: "Computadores",    icon: Laptop },
  { to: "/celulares",    label: "Celulares",        icon: Smartphone },
  { to: "/monitores",    label: "Monitores",        icon: Monitor },
  { to: "/chips",        label: "Chips / SIM",      icon: Wifi },
  { to: "/mantenimiento",label: "Mantenimiento",    icon: Wrench },
  { to: "/actas",              label: "Actas de Entrega",    icon: FileText },
  { to: "/solicitudes-correo", label: "Solicitudes Correo",  icon: Mail },
  { to: "/historial",          label: "Historial",            icon: History },
];

// Nav adicional para ENCARGADO DE OBRA (subconjunto — solo sus CCs)
const NAV_ENCARGADO = [
  { to: "/centros-costo", label: "Mi Centro de Costo", icon: Banknote },
];

// Nav visible solo para ADMINISTRADORES
const NAV_ADMIN = [
  { to: "/catalogos",    label: "Catálogos",        icon: Database },
  { to: "/empleados",    label: "Empleados",         icon: Users },
  { to: "/centros-costo",label: "Centros de Costo",  icon: Banknote },
  { to: "/usuarios",     label: "Usuarios",          icon: UserCog },
  { to: "/ldap",         label: "LDAP / AD",         icon: Server },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, isEncargadoObra, rol, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Cierra la sesión del usuario.
   * Llama a logout() del contexto (limpia localStorage) y redirige a /login
   * usando replace para que el botón Atrás no vuelva a la pantalla protegida.
   */
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const rolLabel = isAdmin ? "Administrador"
    : isEncargadoObra ? "Encargado de Obra"
    : "Operador";

  return (
    <div className="min-h-screen bg-gray-50">
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-52 bg-slate-900 flex flex-col transition-transform duration-300
        lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 shrink-0">
          <Monitor className="w-6 h-6 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-white font-bold text-sm leading-tight truncate">Inventario TI</h1>
            <p className="text-slate-400 text-xs truncate">Elecnor Chile</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-2 px-2 pb-2 space-y-0.5 overflow-y-auto">
          {isAdmin && (
            <>
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1">
                Operaciones
              </p>
              {NAV_COMUN.map((n) => <NavItem key={n.to} n={n} onClose={() => setOpen(false)} />)}
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Administración
              </p>
              {NAV_ADMIN.map((n) => <NavItem key={n.to} n={n} onClose={() => setOpen(false)} />)}
            </>
          )}
          {isEncargadoObra && !isAdmin && (
            <>
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1 flex items-center gap-1">
                <HardHat className="w-3 h-3" /> Operaciones
              </p>
              {NAV_COMUN.map((n) => <NavItem key={n.to} n={n} onClose={() => setOpen(false)} />)}
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1 flex items-center gap-1">
                <HardHat className="w-3 h-3" /> Mi Obra
              </p>
              {NAV_ENCARGADO.map((n) => <NavItem key={n.to} n={n} onClose={() => setOpen(false)} />)}
            </>
          )}
          {!isAdmin && !isEncargadoObra && (
            NAV_COMUN.map((n) => <NavItem key={n.to} n={n} onClose={() => setOpen(false)} />)
          )}
        </nav>

        {/* Usuario + Logout */}
        <div className="px-3 py-3 border-t border-slate-700 shrink-0">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white text-xs font-bold uppercase">
              {(user?.nombre || user?.username || "?")[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.nombre || user?.username}</p>
              <p className="text-slate-400 text-[10px] truncate">{rolLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="lg:pl-52">
        {/* Header móvil */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center px-4 py-2">
            <button className="p-1.5 rounded text-gray-600 hover:bg-gray-100" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="ml-3 text-sm font-medium text-gray-700">Inventario TI</span>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Elemento individual del menú lateral.
 * - n: objeto de navegación con { to, label, icon }
 * - onClose: callback para cerrar el sidebar en móvil al hacer clic
 * Usa NavLink de React Router para aplicar automáticamente la clase activa (bg-blue-600).
 * La prop `end` en la ruta raíz evita que "/" quede siempre activo cuando hay sub-rutas.
 */
function NavItem({ n, onClose }) {
  return (
    <NavLink
      to={n.to}
      end={n.to === "/"}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-xs font-medium
        ${isActive
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"}`
      }
    >
      <n.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{n.label}</span>
    </NavLink>
  );
}
