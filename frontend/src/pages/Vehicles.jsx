import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate, formatDuration, vehicleTypeLabel, detectVehicleType } from '../utils/helpers';

export default function Vehicles() {
  const [tab, setTab] = useState('active');
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchPlate, setSearchPlate] = useState('');
  const [historyFilters, setHistoryFilters] = useState({ plate: '', from: '', to: '' });
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadActive(); }, []);

  async function loadActive() {
    setLoading(true);
    try {
      const res = await api.get('/vehicles/active');
      setActiveVehicles(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyFilters.plate) params.append('plate', historyFilters.plate);
      if (historyFilters.from) params.append('from', historyFilters.from);
      if (historyFilters.to) params.append('to', historyFilters.to);
      const res = await api.get(`/vehicles/history?${params}`);
      setHistory(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'history') loadHistory();
    else loadActive();
  }, [tab]);

  const filtered = activeVehicles.filter(v =>
    !searchPlate || v.plate.includes(searchPlate.toUpperCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro y control de vehículos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar ingreso
        </button>
      </div>

      {alert && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800'
          : alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
          : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <span>{alert.msg}</span>
          <button onClick={() => setAlert(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: 'active', label: 'Activos' }, { id: 'history', label: 'Historial' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              className="input-field max-w-xs"
              placeholder="Buscar por placa..."
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value)}
            />
            <button onClick={loadActive} className="btn-secondary text-sm py-2">Actualizar</button>
            <span className="ml-auto text-sm text-gray-500">{filtered.length} vehículo(s)</span>
          </div>
          <Table loading={loading} rows={filtered} columns={activeColumns} empty="No hay vehículos activos" />
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="flex flex-wrap gap-3 mb-4">
            <input type="text" className="input-field w-40" placeholder="Placa"
              value={historyFilters.plate}
              onChange={e => setHistoryFilters(f => ({ ...f, plate: e.target.value }))} />
            <input type="date" className="input-field w-40"
              value={historyFilters.from}
              onChange={e => setHistoryFilters(f => ({ ...f, from: e.target.value }))} />
            <input type="date" className="input-field w-40"
              value={historyFilters.to}
              onChange={e => setHistoryFilters(f => ({ ...f, to: e.target.value }))} />
            <button onClick={loadHistory} className="btn-primary text-sm py-2">Buscar</button>
          </div>
          <Table loading={loading} rows={history} columns={historyColumns} empty="No hay registros" />
        </div>
      )}

      {showModal && (
        <EntryModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg, level) => {
            setAlert({ type: level || 'success', msg });
            setShowModal(false);
            loadActive();
          }}
        />
      )}
    </div>
  );
}

function EntryModal({ onClose, onSuccess }) {
  const [plate, setPlate] = useState('');
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePlateChange(e) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setPlate(val);
    setDetected(detectVehicleType(val));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!plate) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/vehicles/entry', { plate });
      const data = res.data;
      let msg = `✓ ${data.data.plate} registrado — Espacio ${data.data.space}`;
      let level = 'success';
      if (data.alert) {
        msg += ` | ⚠️ ${data.alert.message}`;
        level = data.alert.level === 'critical' ? 'error' : 'warning';
      }
      onSuccess(msg, level);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Registrar ingreso de vehículo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Placa del vehículo</label>
          <input
            type="text"
            className="input-field font-mono text-lg tracking-widest text-center uppercase"
            placeholder="ABC-123"
            value={plate}
            onChange={handlePlateChange}
            maxLength={8}
            autoFocus
            required
          />
          <p className="text-xs text-gray-400 mt-1">Formato: ABC-123 (carro) · ABC-12A (moto)</p>
        </div>

        {detected && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            detected === 'car' ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'
          }`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              Tipo detectado: {detected === 'car' ? 'Carro' : 'Motocicleta'}
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading || !plate}>
            {loading ? 'Registrando...' : 'Registrar ingreso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const activeColumns = [
  { key: 'plate', label: 'Placa', render: v => <span className="font-mono font-bold">{v.plate}</span> },
  { key: 'type', label: 'Tipo', render: v => <span className={v.type === 'car' ? 'badge-car' : 'badge-moto'}>{vehicleTypeLabel(v.type)}</span> },
  { key: 'space_number', label: 'Espacio', render: v => <span className="font-medium">{v.space_number}</span> },
  { key: 'entry_time', label: 'Ingreso', render: v => formatDate(v.entry_time) },
  { key: 'duration', label: 'Tiempo', render: v => <span className="text-blue-600 font-medium">{formatDuration(v.minutes_parked)}</span> },
];

const historyColumns = [
  { key: 'plate', label: 'Placa', render: v => <span className="font-mono font-bold">{v.plate}</span> },
  { key: 'type', label: 'Tipo', render: v => <span className={v.type === 'car' ? 'badge-car' : 'badge-moto'}>{vehicleTypeLabel(v.type)}</span> },
  { key: 'entry_time', label: 'Ingreso', render: v => formatDate(v.entry_time) },
  { key: 'exit_time', label: 'Salida', render: v => v.exit_time ? formatDate(v.exit_time) : <span className="badge-occupied">Activo</span> },
  { key: 'amount', label: 'Cobro', render: v => v.amount ? `$${Number(v.amount).toLocaleString('es-CO')}` : '-' },
];

function Table({ loading, rows, columns, empty }) {
  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!rows.length) return (
    <div className="text-center py-12 text-gray-400">
      <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-sm">{empty}</p>
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map(c => (
              <th key={c.key} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              {columns.map(c => (
                <td key={c.key} className="py-2.5 px-3 text-gray-700">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
