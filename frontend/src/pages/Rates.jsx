import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';

export default function Rates() {
  const [rates, setRates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/rates');
      setRates(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSave(id) {
    if (!newRate || isNaN(newRate) || Number(newRate) <= 0) return;
    setSaving(true);
    try {
      await api.put(`/rates/${id}`, { rate_per_hour: Number(newRate) });
      setSuccess('Tarifa actualizada correctamente');
      setEditing(null);
      setNewRate('');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = { car: 'Carro', motorcycle: 'Motocicleta' };
  const typeIcon = { car: '🚗', motorcycle: '🏍️' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tarifas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configuración de tarifas por tipo de vehículo</p>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rates.map(rate => (
          <div key={rate.id} className="card">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{typeIcon[rate.vehicle_type]}</span>
              <div>
                <h3 className="font-semibold text-gray-800">{typeLabel[rate.vehicle_type]}</h3>
                <p className="text-xs text-gray-400">Tarifa por hora (fracción)</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Tarifa actual</p>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(rate.rate_per_hour)}</p>
              <p className="text-xs text-gray-400 mt-1">por hora o fracción</p>
            </div>

            {editing === rate.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva tarifa (COP/hora)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Ej: 3000"
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                    min="100"
                    step="100"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(null); setNewRate(''); }} className="btn-secondary flex-1 text-sm">
                    Cancelar
                  </button>
                  <button onClick={() => handleSave(rate.id)} className="btn-primary flex-1 text-sm" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setEditing(rate.id); setNewRate(rate.rate_per_hour); }}
                className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar tarifa
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card bg-blue-50 border border-blue-100">
        <h4 className="font-semibold text-blue-900 mb-2">Cómo se calcula la tarifa</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>El tiempo se mide desde el ingreso hasta la salida</li>
          <li>Se cobra por fracción completa de hora (redondeo hacia arriba)</li>
          <li>Ejemplo: 1h 15min = 2 fracciones → 2 × tarifa</li>
          <li>Mínimo cobro: 1 fracción de hora</li>
        </ul>
      </div>
    </div>
  );
}
