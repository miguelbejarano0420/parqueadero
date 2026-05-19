import axios from 'axios';

// INSTANCIA AXIOS CENTRALIZADA
// Todas las peticiones al backend pasan por esta instancia, lo que permite
// configurar baseURL y headers una sola vez. VITE_API_URL permite apuntar
// al backend local (http://localhost:3001/api) en desarrollo y al backend
// en Render en producción, sin cambiar el código fuente.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// INTERCEPTOR DE PETICIÓN — INYECCIÓN DEL TOKEN JWT
// Antes de que cualquier request salga hacia el backend, este interceptor
// lee el token de localStorage y lo adjunta como header Authorization.
// El backend (verifyToken middleware) lo extrae y valida en cada endpoint protegido.
// Si no hay token (usuario no autenticado), el header simplemente no se envía.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// INTERCEPTOR DE RESPUESTA — MANEJO GLOBAL DE ERRORES DE AUTENTICACIÓN
// Centraliza la lógica de sesión expirada para no repetirla en cada componente.
// DISTINCIÓN CLAVE entre 401 y 403:
//   401 Unauthorized → token ausente o expirado → sesión inválida → redirigir al login
//   403 Forbidden    → token válido pero rol insuficiente → NO redirigir, el usuario
//                      sigue autenticado (ej: operario intentando acceder a /rates)
// Sin esta distinción, un operario quedaría desconectado cada vez que el servidor
// rechace una ruta admin con 403.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
