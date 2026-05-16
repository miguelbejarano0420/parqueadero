const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, update } = require('../controllers/rateController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', verifyToken, getAll);

router.put('/:id', verifyToken, requireAdmin, validate([
  body('rate_per_hour')
    .isFloat({ min: 1 }).withMessage('La tarifa debe ser un número mayor a 0'),
]), update);

module.exports = router;
