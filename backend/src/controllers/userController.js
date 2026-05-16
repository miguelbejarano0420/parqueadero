const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

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
