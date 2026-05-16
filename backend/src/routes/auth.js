const router = require('express').Router();
const { body } = require('express-validator');
const { login, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/login', validate([
  body('username').trim().notEmpty().withMessage('Usuario requerido'),
  body('password').trim().notEmpty().withMessage('Contraseña requerida'),
]), login);

router.get('/profile', verifyToken, getProfile);

module.exports = router;
