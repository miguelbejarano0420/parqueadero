import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Spaces from './pages/Spaces';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Rates from './pages/Rates';
import Users from './pages/Users';

// PROTECCIÓN DE RUTAS POR AUTENTICACIÓN Y ROL
// Este componente envuelve cada página privada y actúa como guardián:
// - Si no hay sesión activa → redirige al login
// - Si la ruta es adminOnly y el usuario es operario → redirige al dashboard
// - Si todo está bien → renderiza la página dentro del Layout
// Esto protege el frontend, pero el backend tiene su propia validación
// independiente con verifyToken y requireAdmin (doble capa de seguridad).
function PrivateRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Ruta pública: si ya hay sesión, va directo al dashboard */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Rutas accesibles para admin y operario */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/vehicles"  element={<PrivateRoute><Vehicles /></PrivateRoute>} />
      <Route path="/spaces"    element={<PrivateRoute><Spaces /></PrivateRoute>} />
      <Route path="/payments"  element={<PrivateRoute><Payments /></PrivateRoute>} />

      {/* Rutas exclusivas del administrador — adminOnly=true activa el control de rol */}
      <Route path="/reports" element={<PrivateRoute adminOnly><Reports /></PrivateRoute>} />
      <Route path="/rates"   element={<PrivateRoute adminOnly><Rates /></PrivateRoute>} />
      <Route path="/users"   element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />

      {/* Cualquier ruta desconocida redirige al dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    // AuthProvider hace disponible el estado de sesión en toda la app
    // BrowserRouter habilita la navegación sin recargar la página (SPA)
    // vercel.json garantiza que Vercel sirva index.html para cualquier ruta
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
