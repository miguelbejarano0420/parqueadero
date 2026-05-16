const router = require('express').Router();
const { body } = require('express-validator');
const { registerPaymentAndExit, getHistory } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(verifyToken);

router.post('/checkout', validate([
  body('plate').trim().notEmpty().withMessage('Placa requerida'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'app'])
    .withMessage('Método de pago inválido (cash, card, app)'),
]), registerPaymentAndExit);

router.get('/history', getHistory);

module.exports = router;
