const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// LISTAR USUARIOS — se excluye password_hash por seguridad.
// Nunca debe enviarse el hash al frontend, aunque esté cifrado.
async function getAll(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name, email, role, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// CREAR USUARIO CON CONTRASEÑA HASHEADA
// bcrypt.hash con factor 10 aplica 2^10 = 1024 rondas de salt.
// Es deliberadamente lento para dificultar ataques de fuerza bruta offline
// si la base de datos llegara a ser comprometida.
// Se verifica duplicado antes de insertar para retornar 409 (Conflict) en vez
// de dejar que MySQL lance un error de clave única (que sería un 500 genérico).
async function create(req, res) {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  const name     = (req.body.name || '').trim();
  const email    = (req.body.email || '').trim();
  const role     = req.body.role;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ success: false, message: 'Campos requeridos: username, password, name, role' });
  }
  if (!['admin', 'operator'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, message: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, hash, name, email || null, role]
    );

    res.status(201).json({ success: true, message: 'Usuario creado', id: result.insertId });
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ACTUALIZACIÓN PARCIAL CON QUERY DINÁMICA
// Solo actualiza los campos que vienen en el body — patrón patch parcial.
// Construye el SET dinámicamente para no sobreescribir campos que no se enviaron.
// Si viene una nueva contraseña, se hashea antes de almacenarla.
// El campo active acepta true/false del frontend y lo convierte a 1/0 para MySQL TINYINT.
async function update(req, res) {
  const { id } = req.params;
  const { name, email, role, active, password } = req.body;

  try {
    const fields = [];
    const values = [];

    if (name) { fields.push('name = ?'); values.push(name); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (role) { fields.push('role = ?'); values.push(role); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(hash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// BAJA LÓGICA (SOFT DELETE) — no se elimina el registro de la BD.
// Razón: los registros de vehículos y pagos tienen FK hacia users.operator_id.
// Eliminar físicamente el usuario rompería la integridad referencial del historial.
// active = 0 impide el login (authController verifica active = 1) pero preserva
// la trazabilidad de quién registró cada vehículo o cobro en el pasado.
async function remove(req, res) {
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Usuario desactivado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { getAll, create, update, remove };
