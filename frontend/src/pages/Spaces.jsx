import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

export default function Spaces() {
  const [data, setData] = useState({ data: [], summary: { total: 0, occupied: 0, available: 0, occupancyPct: 0 } });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/spaces');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const spaces = data.data || [];
  const filtered = spaces.filter(s => {
    if (filter === 'car') return s.type === 'car';
    if (filter === 'motorcycle') return s.type === 'motorcycle';
    if (filter === 'occupied') return s.status === 'occupied';
    if (filter === 'available') return s.status === 'available';
    return true;
  });

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Espacios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estado de los espacios del parqueadero</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm py-1.5 px-3">Actualizar</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: summary.total, color: 'text-gray-800' },
          { label: 'Ocupados', value: summary.occupied, color: 'text-red-600' },
          { label: 'Disponibles', value: summary.available, color: 'text-green-600' },
          { label: 'Ocupación', value: `${summary.occupancyPct}%`, color: summary.occupancyPct >= 90 ? 'text-red-600' : 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'available', label: 'Disponibles' },
          { id: 'occupied', label: 'Ocupados' },
          { id: 'car', label: 'Carros' },
          { id: 'motorcycle', label: 'Motos' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filtered.map(space => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ space }) {
  const isOccupied = space.status === 'occupied';
  const isCar = space.type === 'car';

  return (
    <div className={`
      rounded-xl p-3 border-2 text-center transition-all
      ${isOccupied
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-green-50 border-green-200 text-green-800'
      }
    `}>
      <div className="text-lg mb-1">{isCar ? '🚗' : '🏍️'}</div>
      <p className="text-xs font-bold">{space.number}</p>
      <p className="text-xs mt-0.5 opacity-75">{isOccupied ? 'Ocupado' : 'Libre'}</p>
      {space.plate && (
        <p className="text-xs font-mono font-semibold mt-1 truncate">{space.plate}</p>
      )}
    </div>
  );
}
