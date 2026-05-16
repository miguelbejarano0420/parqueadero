export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(dateStr));
}

export function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(dateStr));
}

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

export function paymentMethodLabel(method) {
  const map = { cash: 'Efectivo', card: 'Tarjeta', app: 'App' };
  return map[method] || method;
}

export function vehicleTypeLabel(type) {
  const map = { car: 'Carro', motorcycle: 'Moto' };
  return map[type] || type;
}

export function detectVehicleType(plate) {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  if (/^[A-Z]{3}\d{3}$/.test(cleaned)) return 'car';
  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(cleaned)) return 'motorcycle';
  return null;
}
