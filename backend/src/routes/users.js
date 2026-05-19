const router = require('express').Router();
const { body } = require('express-validator');
const { getAll, create, update, remove } = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Todas las rutas de usuarios son exclusivas del administrador.
// verifyToken verifica que el JWT sea válido (401 si no), requireAdmin
// verifica que el rol sea 'admin' (403 si es operario).
router.use(verifyToken, requireAdmin);

router.get('/', getAll);

router.post('/', validate([
  body('username')
    .trim().notEmpty().withMessage('Usuario requerido')
    .isLength({ min: 3, max: 30 }).withMessage('Usuario debe tener entre 3 y 30 caracteres')
    .matches(/^\S+$/).withMessage('El usuario no puede contener espacios'),
  body('password')
    .trim().isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
  body('name')
    .trim().notEmpty().withMessage('Nombre requerido'),
  body('role')
    .isIn(['admin', 'operator']).withMessage('Rol inválido (admin u operator)'),
]), create);

router.put('/:id', validate([
  body('role').optional().isIn(['admin', 'operator']).withMessage('Rol inválido'),
  body('password').optional().isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
]), update);

router.delete('/:id', remove);

module.exports = router;
