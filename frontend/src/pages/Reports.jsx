import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import { formatCurrency, formatDate, paymentMethodLabel, vehicleTypeLabel } from '../utils/helpers';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export default function Reports() {
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(today());
  const [occupancyFilters, setOccupancyFilters] = useState({
    from: today(),
    to: today(),
  });
  const [dailyData, setDailyData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [occError, setOccError] = useState('');
  const [dailyError, setDailyError] = useState('');

  useEffect(() => {
    if (tab === 'daily') loadDaily();
    else loadOccupancy();
  }, [tab]);

  async function loadDaily() {
    setLoading(true);
    setDailyError('');
    try {
      const res = await api.get(`/reports/daily?date=${date}`);
      setDailyData(res.data);
    } catch (err) {
      setDailyError(err.response?.data?.message || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }

  async function loadOccupancy() {
    setLoading(true);
    setOccError('');
    setOccupancyData(null);
    try {
      const p = new URLSearchParams(occupancyFilters);
      const res = await api.get(`/reports/occupancy?${p}`);
      setOccupancyData(res.data);
    } catch (err) {
      setOccError(err.response?.data?.message || 'Error al cargar el reporte de ocupación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Análisis de ingresos y ocupación</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: 'daily', label: 'Ingresos del día' }, { id: 'occupancy', label: 'Ocupación' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow text-blue-700' : 'text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="space-y-6">
          <div className="flex gap-3 items-center">
            <input type="date" className="input-field w-44" value={date}
              onChange={e => setDate(e.target.value)} />
            <button onClick={loadDaily} className="btn-primary text-sm py-2">Generar</button>
          </div>

          {dailyError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{dailyError}</div>
          )}

          {loading && <Spinner />}

          {!loading && dailyData && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Total ingresos" value={formatCurrency(dailyData.summary.total_income)} color="green" />
                <SummaryCard label="Transacciones" value={dailyData.summary.total_transactions} color="blue" />
                <SummaryCard label="Carros" value={`${formatCurrency(dailyData.summary.car_income)} (${dailyData.summary.car_count})`} color="blue" />
                <SummaryCard label="Motos" value={`${formatCurrency(dailyData.summary.moto_income)} (${dailyData.summary.moto_count})`} color="purple" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart by hour */}
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Ingresos por hora</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyData.byHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => formatCurrency(v)} labelFormatter={l => `${l}:00`} />
                      <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie payment methods */}
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Por método de pago</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Efectivo', value: Number(dailyData.summary.cash_income) || 0 },
                          { name: 'Tarjeta', value: Number(dailyData.summary.card_income) || 0 },
                          { name: 'App', value: Number(dailyData.summary.app_income) || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Transactions table */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Transacciones del día ({dailyData.transactions.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Placa', 'Tipo', 'Hora cobro', 'Monto', 'Método', 'Operario'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.transactions.map((t, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-mono font-bold">{t.plate}</td>
                          <td className="py-2 px-3"><span className={t.type === 'car' ? 'badge-car' : 'badge-moto'}>{vehicleTypeLabel(t.type)}</span></td>
                          <td className="py-2 px-3 text-gray-600">{formatDate(t.payment_time)}</td>
                          <td className="py-2 px-3 font-semibold text-green-600">{formatCurrency(t.amount)}</td>
                          <td className="py-2 px-3">{paymentMethodLabel(t.payment_method)}</td>
                          <td className="py-2 px-3 text-gray-500">{t.operator_name}</td>
                        </tr>
                      ))}
                      {!dailyData.transactions.length && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin transacciones</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'occupancy' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Desde</label>
              <input type="date" className="input-field w-40" value={occupancyFilters.from}
                onChange={e => setOccupancyFilters(f => ({ ...f, from: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Hasta</label>
              <input type="date" className="input-field w-40" value={occupancyFilters.to}
                onChange={e => setOccupancyFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
            <button onClick={loadOccupancy} className="btn-primary text-sm py-2">Generar</button>
          </div>

          {occError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{occError}</div>
          )}

          {loading && <Spinner />}

          {!loading && occupancyData && (
            <>
              {occupancyData.spaces && (
                <div className="grid grid-cols-2 gap-4">
                  {occupancyData.spaces.map(s => (
                    <div key={s.type} className="card">
                      <p className="text-sm text-gray-500 mb-1">{s.type === 'car' ? '🚗 Carros (ahora)' : '🏍️ Motos (ahora)'}</p>
                      <p className="text-2xl font-bold">{s.occupied}/{s.total}</p>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${s.total > 0 ? Math.round((s.occupied / s.total) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-1">Vehículos por día</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Ingresos del {occupancyFilters.from} al {occupancyFilters.to}
                </p>

                {occupancyData.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm">Sin datos para el rango seleccionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={occupancyData.data} margin={{ bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cars" name="Carros" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="motorcycles" name="Motos" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          {!loading && !occupancyData && !occError && (
            <div className="card text-center py-10 text-gray-400 text-sm">
              Selecciona un rango de fechas y haz clic en <strong>Generar</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = { green: 'text-green-600', blue: 'text-blue-600', purple: 'text-purple-600' };
  return (
    <div className="card">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
}
