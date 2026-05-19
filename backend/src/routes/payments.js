const router = require('express').Router();
const { body } = require('express-validator');
const { registerPaymentAndExit, getHistory } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(verifyToken);

// POST /api/payments/checkout — registra el pago y marca la salida del vehículo
// Ejecuta una transacción ACID: INSERT payment + UPDATE vehicle exit_time + UPDATE space status
// Si cualquier paso falla, hace ROLLBACK para dejar la BD en estado consistente.
router.post('/checkout', validate([
  body('plate').trim().notEmpty().withMessage('Placa requerida'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'app'])
    .withMessage('Método de pago inválido (cash, card, app)'),
]), registerPaymentAndExit);

// GET /api/payments/history — accesible para admin y operario (para auditoría del día)
router.get('/history', getHistory);

module.exports = router;
