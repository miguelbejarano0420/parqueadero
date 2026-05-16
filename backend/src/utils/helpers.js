// Detecta tipo de vehículo según placa colombiana
// Carros: ABC-123 (3 letras + 3 números)
// Motos: ABC-12A (3 letras + 2 números + 1 letra)
function detectVehicleType(plate) {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  const carPattern = /^[A-Z]{3}\d{3}$/;
  const motoPattern = /^[A-Z]{3}\d{2}[A-Z]$/;

  if (carPattern.test(cleaned)) return 'car';
  if (motoPattern.test(cleaned)) return 'motorcycle';
  return null;
}

function formatPlate(plate) {
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return plate.toUpperCase();
}

function calculateFare(entryTime, exitTime, ratePerHour) {
  const diffMs = new Date(exitTime) - new Date(entryTime);
  const diffMinutes = diffMs / (1000 * 60);
  const fractions = Math.ceil(diffMinutes / 60);
  const hours = Math.max(fractions, 1);
  return {
    minutes: Math.round(diffMinutes),
    hours,
    total: hours * ratePerHour,
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

module.exports = { detectVehicleType, formatPlate, calculateFare, formatCurrency };
