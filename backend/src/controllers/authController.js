const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// INICIO DE SESIÓN
// Flujo completo de autenticación en 3 pasos:
// 1. Buscar el usuario por nombre en la BD (solo si está activo)
// 2. Comparar la contraseña con el hash guardado usando bcrypt
// 3. Si todo es válido, firmar un JWT con los datos del usuario
async function login(req, res) {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
  }

  try {
    // PASO 1: Buscar usuario activo
    // active = 1 asegura que usuarios desactivados por el admin no puedan entrar
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND active = 1',
      [username]
    );

    if (rows.length === 0) {
      // Mismo mensaje para usuario inexistente y contraseña incorrecta:
      // no revelar si el usuario existe o no (seguridad)
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const user = rows[0];

    // PASO 2: Verificar contraseña con bcrypt
    // bcrypt.compare compara el texto plano contra el hash sin descifrarlo.
    // Las contraseñas NUNCA se guardan en texto plano en la BD.
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    // PASO 3: Generar token JWT
    // El token contiene id, username, rol y nombre del usuario.
    // Está firmado con JWT_SECRET (variable de entorno) y expira en 8 horas.
    // El frontend lo guarda en localStorage y lo envía en cada petición.
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// PERFIL DEL USUARIO AUTENTICADO
// Usa req.user.id inyectado por el middleware verifyToken
// para consultar los datos actualizados del usuario desde la BD.
async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { login, getProfile };
