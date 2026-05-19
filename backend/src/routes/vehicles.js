const router = require('express').Router();
const { body, param } = require('express-validator');
const { registerEntry, getActive, getByPlate, getHistory, getVehicleForExit } = require('../controllers/vehicleController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

// verifyToken aplicado a todas las rutas del módulo — operario y admin pueden acceder
router.use(verifyToken);

// POST /api/vehicles/entry — registra la entrada de un vehículo
// La regex acepta ambos formatos de placa colombiana con o sin guion:
//   ABC-123 o ABC123  → carro
//   ABC-12A o ABC12A  → moto
router.post('/entry', validate([
  body('plate')
    .trim().notEmpty().withMessage('Placa requerida')
    .matches(/^[A-Za-z]{3}[-\s]?\d{3}$|^[A-Za-z]{3}[-\s]?\d{2}[A-Za-z]$/)
    .withMessage('Placa colombiana inválida (ej: ABC-123 carro, ABC-12A moto)'),
]), registerEntry);

// GET /api/vehicles/active   — lista vehículos actualmente en el parqueadero
// GET /api/vehicles/history  — historial completo de visitas (con exit_time)
// IMPORTANTE: /active y /history deben estar ANTES de /:plate para que Express
// no intente interpretar "active" o "history" como valores del parámetro :plate.
router.get('/active',  getActive);
router.get('/history', getHistory);

// GET /api/vehicles/exit/:plate — cálculo del cobro antes de confirmar la salida
router.get('/exit/:plate', validate([
  param('plate').trim().notEmpty().withMessage('Placa requerida'),
]), getVehicleForExit);

// GET /api/vehicles/:plate — búsqueda por placa (historial de un vehículo específico)
router.get('/:plate', validate([
  param('plate').trim().notEmpty().withMessage('Placa requerida'),
]), getByPlate);

module.exports = router;
