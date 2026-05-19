const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, update } = require('../controllers/rateController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// GET /api/rates — accesible para admin Y operario (consultar precio antes de cobrar)
router.get('/', verifyToken, getAll);

// PUT /api/rates/:id — solo admin puede modificar tarifas
// isFloat({ min: 1 }) rechaza valores negativos, cero, y strings no numéricos
router.put('/:id', verifyToken, requireAdmin, validate([
  body('rate_per_hour')
    .isFloat({ min: 1 }).withMessage('La tarifa debe ser un número mayor a 0'),
]), update);

module.exports = router;
