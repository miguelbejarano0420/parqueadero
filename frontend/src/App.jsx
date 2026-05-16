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
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
      <Route path="/spaces" element={<PrivateRoute><Spaces /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute adminOnly><Reports /></PrivateRoute>} />
      <Route path="/rates" element={<PrivateRoute adminOnly><Rates /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
