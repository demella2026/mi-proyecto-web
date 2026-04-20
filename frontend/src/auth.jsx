import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

/**
 * Decodifica el payload (parte central) de un JWT sin librería externa.
 * Un JWT tiene la forma: header.payload.signature — solo interesa el payload.
 * Convierte Base64URL a Base64 estándar (+/) antes de decodificar con atob().
 * Retorna el objeto JSON del payload o null si el token es inválido/malformado.
 */
function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Proveedor de contexto de autenticación.
 * Persiste el access token en localStorage (clave 'inv_access').
 * Al montar, lee el token existente para restaurar la sesión sin re-login.
 * Expone a toda la app mediante useAuth():
 * - token: string JWT o null
 * - user: payload decodificado del JWT (contains username, nombre, rol, etc.)
 * - isAdmin: true si user.is_admin === true
 * - rol: string del rol ('ADMIN', 'ENCARGADO_OBRA', 'VIEWER')
 * - isEncargadoObra: atajo booleano para el rol ENCARGADO_OBRA
 * - centroCostoId: ID del CC asignado al usuario (null si no aplica)
 * - login(access, refresh): guarda tokens y actualiza estado
 * - logout(): elimina tokens y limpia estado
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("inv_access"));
  const user              = token ? parseJwt(token) : null;
  const isAdmin           = user?.is_admin ?? false;
  const rol               = user?.rol ?? "VIEWER";
  const isEncargadoObra   = rol === "ENCARGADO_OBRA";
  const centroCostoId     = user?.centro_costo_id ?? null;

  /**
   * Guarda el par access/refresh en localStorage y actualiza el estado React.
   * Llamado desde Login.jsx tras una autenticación exitosa.
   */
  const login = useCallback((access, refresh) => {
    localStorage.setItem("inv_access",  access);
    localStorage.setItem("inv_refresh", refresh);
    setToken(access);
  }, []);

  /**
   * Elimina ambos tokens del localStorage y limpia el estado.
   * Provoca que RequireAuth en App.jsx redirija al usuario a /login.
   */
  const logout = useCallback(() => {
    localStorage.removeItem("inv_access");
    localStorage.removeItem("inv_refresh");
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, isAdmin, rol,
      isEncargadoObra, centroCostoId,
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
