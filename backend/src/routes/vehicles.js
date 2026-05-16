const router = require('express').Router();
const { body, param } = require('express-validator');
const { registerEntry, getActive, getByPlate, getHistory, getVehicleForExit } = require('../controllers/vehicleController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(verifyToken);

router.post('/entry', validate([
  body('plate')
    .trim().notEmpty().withMessage('Placa requerida')
    .matches(/^[A-Za-z]{3}[-\s]?\d{3}$|^[A-Za-z]{3}[-\s]?\d{2}[A-Za-z]$/)
    .withMessage('Placa colombiana inválida (ej: ABC-123 carro, ABC-12A moto)'),
]), registerEntry);

router.get('/active', getActive);
router.get('/history', getHistory);

router.get('/exit/:plate', validate([
  param('plate').trim().notEmpty().withMessage('Placa requerida'),
]), getVehicleForExit);

router.get('/:plate', validate([
  param('plate').trim().notEmpty().withMessage('Placa requerida'),
]), getByPlate);

module.exports = router;
