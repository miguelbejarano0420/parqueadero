const { pool } = require('../config/database');

function colombiaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

async function dailyIncome(req, res) {
  const targetDate = req.query.date || colombiaToday();

  try {
    const [totals] = await pool.query(
      `SELECT
         COALESCE(SUM(p.amount), 0) as total_income,
         COUNT(p.id) as total_transactions,
         SUM(CASE WHEN v.type = 'car' THEN p.amount ELSE 0 END) as car_income,
         SUM(CASE WHEN v.type = 'motorcycle' THEN p.amount ELSE 0 END) as moto_income,
         SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END) as cash_income,
         SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END) as card_income,
         SUM(CASE WHEN p.payment_method = 'app' THEN p.amount ELSE 0 END) as app_income,
         COUNT(CASE WHEN v.type = 'car' THEN 1 END) as car_count,
         COUNT(CASE WHEN v.type = 'motorcycle' THEN 1 END) as moto_count
       FROM payments p
       JOIN vehicles v ON p.vehicle_id = v.id
       WHERE DATE(CONVERT_TZ(p.payment_time, '+00:00', '-05:00')) = ?`,
      [targetDate]
    );

    const [byHour] = await pool.query(
      `SELECT HOUR(CONVERT_TZ(p.payment_time, '+00:00', '-05:00')) as hour,
              COUNT(*) as count, SUM(p.amount) as income
       FROM payments p
       WHERE DATE(CONVERT_TZ(p.payment_time, '+00:00', '-05:00')) = ?
       GROUP BY HOUR(CONVERT_TZ(p.payment_time, '+00:00', '-05:00'))
       ORDER BY hour`,
      [targetDate]
    );

    const [transactions] = await pool.query(
      `SELECT p.*, v.plate, v.type, v.entry_time, u.name as operator_name
       FROM payments p
       JOIN vehicles v ON p.vehicle_id = v.id
       JOIN users u ON p.operator_id = u.id
       WHERE DATE(CONVERT_TZ(p.payment_time, '+00:00', '-05:00')) = ?
       ORDER BY p.payment_time DESC`,
      [targetDate]
    );

    res.json({
      success: true,
      date: targetDate,
      summary: totals[0],
      byHour,
      transactions,
    });
  } catch (err) {
    console.error('dailyIncome error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function occupancy(req, res) {
  const fromDate = req.query.from || colombiaToday();
  const toDate   = req.query.to   || fromDate;

  try {
    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(CONVERT_TZ(entry_time, '+00:00', '-05:00'), '%Y-%m-%d') as period,
         MIN(DATE_FORMAT(CONVERT_TZ(entry_time, '+00:00', '-05:00'), '%d/%m/%Y')) as label,
         COUNT(*)                                                               as total_vehicles,
         COUNT(CASE WHEN type = 'car' THEN 1 END)                              as cars,
         COUNT(CASE WHEN type = 'motorcycle' THEN 1 END)                       as motorcycles
       FROM vehicles
       WHERE DATE(CONVERT_TZ(entry_time, '+00:00', '-05:00')) BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(CONVERT_TZ(entry_time, '+00:00', '-05:00'), '%Y-%m-%d')
       ORDER BY period`,
      [fromDate, toDate]
    );

    const [spaceSummary] = await pool.query(
      `SELECT type, COUNT(*) as total, SUM(status = 'occupied') as occupied
       FROM spaces GROUP BY type`
    );

    res.json({ success: true, data: rows, spaces: spaceSummary });
  } catch (err) {
    console.error('occupancy error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { dailyIncome, occupancy };
