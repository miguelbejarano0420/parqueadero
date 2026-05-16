import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user) {
    try {
      await api.put(`/users/${user.id}`, { active: !user.active });
      setSuccess(`Usuario ${user.active ? 'desactivado' : 'activado'}`);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de administradores y operarios</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setEditUser(null); setShowModal(true); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{success}</div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Usuario', 'Rol', 'Email', 'Estado', 'Creado', 'Acciones'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-medium text-gray-800">{user.name}</td>
                    <td className="py-3 px-3 font-mono text-gray-600">{user.username}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Operario'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{user.email || '-'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditUser(user); setShowModal(true); }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`text-xs font-medium ${user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            setSuccess(msg);
            setShowModal(false);
            load();
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'operator',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!user;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isEdit && !form.password) {
      setError('La contraseña es requerida para nuevos usuarios');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${user.id}`, payload);
        onSuccess('Usuario actualizado correctamente');
      } else {
        await api.post('/users', form);
        onSuccess('Usuario creado correctamente');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Editar usuario' : 'Crear usuario'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input type="text" className="input-field" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input type="text" className="input-field font-mono" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))}
              required disabled={isEdit}
              placeholder="sin espacios (ej: operario1)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select className="input-field" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="operator">Operario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            </label>
            <input type="password" className="input-field" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required={!isEdit} minLength={6} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
