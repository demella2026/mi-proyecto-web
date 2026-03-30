import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Laptops from "./pages/Laptops";
import Celulares from "./pages/Celulares";
import Catalogos from "./pages/Catalogos";
import Empleados from "./pages/Empleados";
import Historial from "./pages/Historial";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/laptops" element={<Laptops />} />
        <Route path="/celulares" element={<Celulares />} />
        <Route path="/catalogos" element={<Catalogos />} />
        <Route path="/empleados" element={<Empleados />} />
        <Route path="/historial" element={<Historial />} />
      </Route>
    </Routes>
  );
}