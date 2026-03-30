import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Laptop, Smartphone, Database,
  Users, History, Menu, X, Monitor,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/laptops", label: "Laptops", icon: Laptop },
  { to: "/celulares", label: "Celulares", icon: Smartphone },
  { to: "/catalogos", label: "Catálogos", icon: Database },
  { to: "/empleados", label: "Empleados", icon: Users },
  { to: "/historial", label: "Historial", icon: History },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transition-transform duration-300
        lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <Monitor className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Inventario TI</h1>
            <p className="text-slate-400 text-xs">Sistema de Gestión</p>
          </div>
        </div>
        <nav className="mt-6 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium
                ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <button className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => setOpen(!open)}>
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <span className="text-sm text-gray-500 hidden sm:block">Panel de Administración</span>
          </div>
        </header>
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}