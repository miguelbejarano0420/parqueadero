import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { formatCurrency, formatDate, formatDuration, vehicleTypeLabel, paymentMethodLabel } from '../utils/helpers';

export default function Payments() {
  const [tab, setTab] = useState('checkout');
  const [plate, setPlate] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [searching, setSearching] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '' });

  async function searchVehicle() {
    if (!plate) return;
    setSearching(true);
    setVehicleInfo(null);
    setError('');
    try {
      const res = await api.get(`/vehicles/exit/${plate.replace(/\s/g, '').toUpperCase()}`);
      setVehicleInfo(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Vehículo no encontrado');
    } finally {
      setSearching(false);
    }
  }

  async function processPayment() {
    setProcessing(true);
    setError('');
    try {
      const res = await api.post('/payments/checkout', { plate: vehicleInfo.plate, paymentMethod });
      setTicket(res.data.ticket);
      setVehicleInfo(null);
      setPlate('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar pago');
    } finally {
      setProcessing(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      const res = await api.get(`/payments/history?${params}`);
      setHistory(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos y Cobros</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro de salidas y cobros de vehículos</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: 'checkout', label: 'Cobrar salida' }, { id: 'history', label: 'Historial' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'checkout' && (
        <div className="max-w-lg space-y-4">
          {ticket ? (
            <TicketView ticket={ticket} onNew={() => setTicket(null)} />
          ) : (
            <>
              {/* Search */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Buscar vehículo</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field font-mono text-center uppercase tracking-widest"
                    placeholder="ABC-123"
                    value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && searchVehicle()}
                    maxLength={8}
                  />
                  <button onClick={searchVehicle} className="btn-primary px-5 flex-shrink-0" disabled={searching || !plate}>
                    {searching ? '...' : 'Buscar'}
                  </button>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              {/* Vehicle info */}
              {vehicleInfo && (
                <div className="card border-l-4 border-blue-500">
                  <h3 className="font-semibold text-gray-800 mb-4">Resumen del cobro</h3>
                  <div className="space-y-2 text-sm">
                    <Row label="Placa" value={<span className="font-mono font-bold text-lg">{vehicleInfo.plate}</span>} />
                    <Row label="Tipo" value={<span className={vehicleInfo.type === 'car' ? 'badge-car' : 'badge-moto'}>{vehicleTypeLabel(vehicleInfo.type)}</span>} />
                    <Row label="Espacio" value={vehicleInfo.space_number} />
                    <Row label="Ingreso" value={formatDate(vehicleInfo.entry_time)} />
                    <Row label="Tiempo" value={<span className="font-medium text-blue-600">{formatDuration(vehicleInfo.minutes_parked)}</span>} />
                    <Row label="Fracciones" value={`${vehicleInfo.fractions} hora(s)`} />
                    <Row label="Tarifa/hora" value={formatCurrency(vehicleInfo.rate_per_hour)} />
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <Row label="TOTAL A COBRAR" value={
                        <span className="text-xl font-bold text-green-600">{formatCurrency(vehicleInfo.total)}</span>
                      } />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Método de pago</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ id: 'cash', label: 'Efectivo', icon: '💵' }, { id: 'card', label: 'Tarjeta', icon: '💳' }, { id: 'app', label: 'App', icon: '📱' }].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id)}
                          className={`py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                            paymentMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          <div className="text-lg">{m.icon}</div>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={processPayment} className="btn-success w-full mt-4" disabled={processing}>
                    {processing ? 'Procesando...' : `Confirmar pago — ${formatCurrency(vehicleInfo.total)}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="flex flex-wrap gap-3 mb-4">
            <input type="date" className="input-field w-40" value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
            <input type="date" className="input-field w-40" value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
            <button onClick={loadHistory} className="btn-primary text-sm py-2">Filtrar</button>
          </div>
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Placa', 'Tipo', 'Ingreso', 'Salida', 'Tiempo', 'Monto', 'Pago', 'Operario'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((p, i) => {
                    const mins = p.exit_time
                      ? Math.round((new Date(p.exit_time) - new Date(p.entry_time)) / 60000)
                      : null;
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold">{p.plate}</td>
                        <td className="py-2.5 px-3"><span className={p.type === 'car' ? 'badge-car' : 'badge-moto'}>{vehicleTypeLabel(p.type)}</span></td>
                        <td className="py-2.5 px-3 text-gray-600">{formatDate(p.entry_time)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{formatDate(p.exit_time)}</td>
                        <td className="py-2.5 px-3 text-blue-600 font-medium">{formatDuration(mins)}</td>
                        <td className="py-2.5 px-3 font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                        <td className="py-2.5 px-3">{paymentMethodLabel(p.payment_method)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{p.operator_name}</td>
                      </tr>
                    );
                  })}
                  {!history.length && (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin registros</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketView({ ticket, onNew }) {
  const printRef = useRef();

  function handlePrint() {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <html><head><title>Tiquete Parqueadero</title>
      <style>
        body { font-family: monospace; padding: 20px; font-size: 13px; }
        h2 { text-align: center; }
        hr { border: 1px dashed #ccc; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .total { font-size: 18px; font-weight: bold; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
    win.close();
  }

  const mins = ticket.minutes;

  return (
    <div className="card border-2 border-green-200">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-green-800">Pago exitoso</h3>
      </div>

      <div ref={printRef}>
        <h2>🅿️ ParkSystem</h2>
        <hr />
        <div className="space-y-1.5 text-sm font-mono bg-gray-50 p-4 rounded-lg">
          {[
            ['Placa', ticket.plate],
            ['Tipo', ticket.type === 'car' ? 'Carro' : 'Moto'],
            ['Ingreso', formatDate(ticket.entryTime)],
            ['Salida', formatDate(ticket.exitTime)],
            ['Tiempo', formatDuration(mins)],
            ['Fracciones', `${ticket.fractions} hora(s)`],
            ['Tarifa/hora', formatCurrency(ticket.ratePerHour)],
            ['Método', paymentMethodLabel(ticket.paymentMethod)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
            <span className="font-bold">TOTAL COBRADO</span>
            <span className="text-green-600 text-lg font-bold">{formatCurrency(ticket.amount)}</span>
          </div>
          <p className="text-center text-xs text-gray-400 pt-2">Atendido por: {ticket.operatorName}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={handlePrint} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button onClick={onNew} className="btn-primary flex-1">Nuevo cobro</button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
