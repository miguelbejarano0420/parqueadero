const { pool } = require('../config/database');

// CONSULTAR TARIFAS VIGENTES
// Retorna las tarifas activas por tipo de vehículo (carro y moto).
// Accesible para admin y operario porque el operario necesita
// mostrar el precio estimado antes de confirmar el cobro.
async function getAll(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM rates ORDER BY vehicle_type');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// ACTUALIZAR TARIFA POR TIPO DE VEHÍCULO
// Solo accesible para administradores (requireAdmin en la ruta).
// updated_at = NOW() registra automáticamente cuándo fue el último cambio,
// lo que permite auditar el historial de modificaciones de precios.
async function update(req, res) {
  const { id } = req.params;
  const { rate_per_hour } = req.body;

  if (!rate_per_hour || rate_per_hour <= 0) {
    return res.status(400).json({ success: false, message: 'Tarifa inválida' });
  }

  try {
    await pool.query(
      'UPDATE rates SET rate_per_hour = ?, updated_at = NOW() WHERE id = ?',
      [rate_per_hour, id]
    );
    res.json({ success: true, message: 'Tarifa actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { getAll, update };
