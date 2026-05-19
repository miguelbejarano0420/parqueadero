const jwt = require('jsonwebtoken');

// VERIFICACIÓN DE TOKEN JWT
// Este middleware se ejecuta antes de cada endpoint protegido.
// Extrae el token del header "Authorization: Bearer <token>",
// lo verifica con la clave secreta del servidor y, si es válido,
// adjunta los datos del usuario (id, username, role) en req.user
// para que los controladores los usen sin volver a consultar la BD.
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    // Sin token: el usuario no ha iniciado sesión o el frontend no lo envió
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }

  try {
    // jwt.verify comprueba firma y expiración (8 horas configuradas en login)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Disponible en todos los controladores como req.user
    next();
  } catch (err) {
    // Token vencido, manipulado o con firma incorrecta
    return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
}

// CONTROL DE ACCESO POR ROL — SOLO ADMINISTRADOR
// Segunda capa de seguridad que se aplica después de verifyToken.
// Aunque el usuario tenga sesión válida, si su rol no es 'admin'
// no puede acceder a rutas de reportes, usuarios ni tarifas.
// Esto protege tanto en frontend (PrivateRoute) como en backend (esta función).
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
