// FORMATO DE MONEDA COLOMBIANA (FRONTEND)
// Usa Intl.NumberFormat nativo del navegador — sin librerías externas.
// amount || 0 evita mostrar "NaN" si el valor llega como undefined o null.
// Ejemplo: 3000 → "$3.000"  |  15500 → "$15.500"
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// FORMATO DE FECHA Y HORA — ZONA HORARIA BOGOTÁ
// El backend guarda los DATETIME en hora Colombia (UTC-5 via SET time_zone).
// Al leer con new Date(dateStr), el motor JS interpreta el string como hora
// local del servidor (Colombia), y Intl.DateTimeFormat lo muestra correctamente.
// timeZone: 'America/Bogota' es la garantía final para clientes en otras zonas.
// Ejemplo: "2025-05-10T14:30:00" → "10/05/2025, 2:30 p. m."
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(dateStr));
}

// FORMATO SOLO HORA — útil en tablas donde la fecha ya está visible en otra columna
// Ejemplo: "2025-05-10T14:30:00" → "2:30 p. m."
export function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(dateStr));
}

// FORMATO DE DURACIÓN EN HORAS Y MINUTOS
// Convierte minutos enteros a texto legible para mostrar el tiempo en parqueadero.
// Ejemplos: 45 → "45min"  |  75 → "1h 15min"  |  120 → "2h 0min"
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

// ETIQUETAS LEGIBLES PARA ENUMS DE LA BASE DE DATOS
// Convierten los valores internos en inglés a texto en español para la UI.
export function paymentMethodLabel(method) {
  const map = { cash: 'Efectivo', card: 'Tarjeta', app: 'App' };
  return map[method] || method;
}

export function vehicleTypeLabel(type) {
  const map = { car: 'Carro', motorcycle: 'Moto' };
  return map[type] || type;
}

// DETECCIÓN DE TIPO DE VEHÍCULO POR PLACA (FRONTEND)
// Misma lógica que el helper del backend — duplicada intencionalmente para
// mostrar retroalimentación inmediata al usuario sin esperar respuesta del servidor.
// Formatos colombianos (Resolución 4959 de 2006):
//   ABC123  → carro (3 letras + 3 dígitos)
//   ABC12A  → moto  (3 letras + 2 dígitos + 1 letra)
export function detectVehicleType(plate) {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  if (/^[A-Z]{3}\d{3}$/.test(cleaned)) return 'car';
  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(cleaned)) return 'motorcycle';
  return null;
}
