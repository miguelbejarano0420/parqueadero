import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

// CONTEXTO DE AUTENTICACIÓN
// Provee el estado de sesión a toda la app sin pasar props manualmente.
// Cualquier componente puede llamar useAuth() para acceder a user, login, logout, etc.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // INICIALIZACIÓN PEREZOSA DEL ESTADO
  // La función pasada a useState solo se ejecuta una vez al montar.
  // Lee localStorage para restaurar la sesión si el usuario recargó la página.
  // Sin esto, cada recarga forzaría al usuario a iniciar sesión de nuevo.
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  // LOGIN: PETICIÓN AL BACKEND + PERSISTENCIA EN LOCALSTORAGE
  // Guarda tanto el token (para las peticiones API) como el objeto user
  // (para mostrar nombre, rol, etc. sin volver a consultar el backend).
  // Retorna { success, message } para que el componente Login muestre errores.
  async function login(username, password) {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Error al iniciar sesión' };
    } finally {
      setLoading(false);
    }
  }

  // LOGOUT: LIMPIEZA TOTAL DEL ESTADO DE SESIÓN
  // Elimina token y datos de usuario del localStorage para que el interceptor
  // de api.js no adjunte un token expirado en peticiones futuras.
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // DERIVADOS DEL ROL — evitan comparar strings en cada componente
  const isAdmin    = user?.role === 'admin';
  const isOperator = user?.role === 'operator';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isOperator }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de conveniencia para consumir el contexto sin importar useContext en cada archivo
export function useAuth() {
  return useContext(AuthContext);
}
