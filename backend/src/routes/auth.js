const router = require('express').Router();
const { body } = require('express-validator');
const { login, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

// POST /api/auth/login — pública, sin verifyToken
// Cadena de middlewares: validate (express-validator) → login (controlador)
// El authLimiter de 10 req/15min se aplica antes en app.js, no aquí.
router.post('/login', validate([
  body('username').trim().notEmpty().withMessage('Usuario requerido'),
  body('password').trim().notEmpty().withMessage('Contraseña requerida'),
]), login);

// GET /api/auth/profile — retorna el usuario decodificado del token
// verifyToken adjunta req.user con los datos del JWT antes de llegar al controlador
router.get('/profile', verifyToken, getProfile);

module.exports = router;
