import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function Dashboard() {
  const [spaces, setSpaces] = useState({ summary: { total: 0, occupied: 0, available: 0, occupancyPct: 0 } });
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [spacesRes, vehiclesRes, reportRes] = await Promise.all([
        api.get('/spaces'),
        api.get('/vehicles/active'),
        api.get('/reports/daily').catch(() => ({ data: { summary: null } })),
      ]);
      setSpaces(spacesRes.data);
      setActiveVehicles(vehiclesRes.data.data.slice(0, 5));
      if (reportRes.data?.summary) setDailyReport(reportRes.data.summary);

      const pct = spacesRes.data.summary?.occupancyPct || 0;
      if (pct >= 100) setAlert({ level: 'critical', msg: 'Parqueadero al 100% — Sin espacios disponibles' });
      else if (pct >= 90) setAlert({ level: 'warning', msg: `Parqueadero al ${pct}% de capacidad` });
      else setAlert(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const { summary } = spaces;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen del estado del parqueadero</p>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          alert.level === 'critical' ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{alert.msg}</span>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total espacios"
          value={summary.total}
          color="blue"
          icon={<GridIcon />}
        />
        <StatCard
          title="Ocupados"
          value={summary.occupied}
          color="red"
          icon={<OccupiedIcon />}
        />
        <StatCard
          title="Disponibles"
          value={summary.available}
          color="green"
          icon={<AvailableIcon />}
        />
        <StatCard
          title="Ocupación"
          value={`${summary.occupancyPct}%`}
          color={summary.occupancyPct >= 90 ? 'red' : summary.occupancyPct >= 70 ? 'yellow' : 'green'}
          icon={<PercentIcon />}
        />
      </div>

      {/* Occupancy bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Ocupación del parqueadero</h3>
          <span className="text-sm text-gray-500">{summary.occupied}/{summary.total} espacios</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${
              summary.occupancyPct >= 90 ? 'bg-red-500' :
              summary.occupancyPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${summary.occupancyPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>0%</span>
          <span className="text-yellow-500 font-medium">90% Alerta</span>
          <span className="text-red-500 font-medium">100% Lleno</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily income */}
        {dailyReport && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Ingresos hoy</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Total ingresos</span>
                <span className="font-bold text-green-600 text-lg">{formatCurrency(dailyReport.total_income)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transacciones</span>
                <span className="font-medium">{dailyReport.total_transactions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Carros</span>
                <span className="font-medium">{formatCurrency(dailyReport.car_income)} ({dailyReport.car_count})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Motos</span>
                <span className="font-medium">{formatCurrency(dailyReport.moto_income)} ({dailyReport.moto_count})</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { label: 'Efectivo', val: dailyReport.cash_income },
                  { label: 'Tarjeta', val: dailyReport.card_income },
                  { label: 'App', val: dailyReport.app_income },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">{m.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{formatCurrency(m.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent vehicles */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Vehículos activos</h3>
            <Link to="/vehicles" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeVehicles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">Sin vehículos activos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeVehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={v.type === 'car' ? 'badge-car' : 'badge-moto'}>
                      {v.type === 'car' ? 'Carro' : 'Moto'}
                    </span>
                    <span className="font-mono font-semibold text-sm text-gray-800">{v.plate}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Esp. {v.space_number}</p>
                    <p className="text-xs text-gray-400">{Math.floor(v.minutes_parked / 60)}h {v.minutes_parked % 60}m</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function GridIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
}
function OccupiedIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function AvailableIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>;
}
function PercentIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
