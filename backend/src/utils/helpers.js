// DETECCIÓN DE TIPO DE VEHÍCULO POR PLACA COLOMBIANA
// Colombia tiene dos formatos de placa vigentes (Resolución 4959 de 2006):
//   Carros:  3 letras + 3 números → ABC123  (formato con guion: ABC-123)
//   Motos:   3 letras + 2 números + 1 letra → ABC12A (formato con guion: ABC-12A)
// La función elimina guiones y espacios antes de aplicar la expresión regular,
// así acepta tanto "ABC123" como "ABC-123" como "ABC 123".
function detectVehicleType(plate) {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  const carPattern  = /^[A-Z]{3}\d{3}$/;   // Exactamente 3 letras + 3 dígitos
  const motoPattern = /^[A-Z]{3}\d{2}[A-Z]$/; // Exactamente 3 letras + 2 dígitos + 1 letra

  if (carPattern.test(cleaned))  return 'car';
  if (motoPattern.test(cleaned)) return 'motorcycle';
  return null; // Placa con formato no reconocido
}

// NORMALIZACIÓN DE PLACA
// Convierte cualquier formato de entrada al formato estándar con guion: ABC-123.
// Se usa antes de guardar en la BD para garantizar consistencia en las búsquedas.
function formatPlate(plate) {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  if (cleaned.length === 6) {
    // Insertar guion entre las letras y los números: "ABC123" → "ABC-123"
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return plate.toUpperCase();
}

// CÁLCULO DE TARIFA POR FRACCIÓN DE HORA
// Regla de negocio: se cobra por cada fracción de hora iniciada, no por tiempo exacto.
// Ejemplos:
//   30 minutos  → Math.ceil(30/60)  = 1 fracción
//   61 minutos  → Math.ceil(61/60)  = 2 fracciones
//   120 minutos → Math.ceil(120/60) = 2 fracciones
//   121 minutos → Math.ceil(121/60) = 3 fracciones
// Math.max(..., 1) garantiza cobro mínimo de 1 fracción aunque el tiempo sea 0.
function calculateFare(entryTime, exitTime, ratePerHour) {
  const diffMs      = new Date(exitTime) - new Date(entryTime);
  const diffMinutes = diffMs / (1000 * 60);
  const fractions   = Math.ceil(diffMinutes / 60);
  const hours       = Math.max(fractions, 1);
  return {
    minutes: Math.round(diffMinutes),
    hours,
    total: hours * ratePerHour,
  };
}

// FORMATO DE MONEDA COLOMBIANA
// Usa la API nativa Intl.NumberFormat para formatear como pesos colombianos.
// Ejemplo: 3000 → "$3.000"  |  15500 → "$15.500"
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

module.exports = { detectVehicleType, formatPlate, calculateFare, formatCurrency };
