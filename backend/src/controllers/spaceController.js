const { pool } = require('../config/database');

async function getAll(req, res) {
  try {
    const [spaces] = await pool.query(
      `SELECT s.*, v.plate, v.entry_time
       FROM spaces s
       LEFT JOIN vehicles v ON s.id = v.space_id AND v.exit_time IS NULL
       ORDER BY s.type, s.number`
    );

    const total = spaces.length;
    const occupied = spaces.filter(s => s.status === 'occupied').length;
    const available = total - occupied;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

    res.json({
      success: true,
      data: spaces,
      summary: { total, occupied, available, occupancyPct },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

async function getAvailable(req, res) {
  const { type } = req.query;
  try {
    let query = "SELECT * FROM spaces WHERE status = 'available'";
    const params = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY number LIMIT 1';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

async function create(req, res) {
  const { number, type, floor } = req.body;
  if (!number || !type) {
    return res.status(400).json({ success: false, message: 'Número y tipo requeridos' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO spaces (number, type, floor) VALUES (?, ?, ?)',
      [number, type, floor || 1]
    );
    res.status(201).json({ success: true, message: 'Espacio creado', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Número de espacio ya existe' });
    }
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { getAll, getAvailable, create };
