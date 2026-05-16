const { pool } = require('../config/database');

async function dailyIncome(req, res) {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

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
       WHERE DATE(p.payment_time) = ?`,
      [targetDate]
    );

    const [byHour] = await pool.query(
      `SELECT HOUR(p.payment_time) as hour, COUNT(*) as count, SUM(p.amount) as income
       FROM payments p
       WHERE DATE(p.payment_time) = ?
       GROUP BY HOUR(p.payment_time)
       ORDER BY hour`,
      [targetDate]
    );

    const [transactions] = await pool.query(
      `SELECT p.*, v.plate, v.type, v.entry_time, u.name as operator_name
       FROM payments p
       JOIN vehicles v ON p.vehicle_id = v.id
       JOIN users u ON p.operator_id = u.id
       WHERE DATE(p.payment_time) = ?
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
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

async function occupancy(req, res) {
  const { from, to, groupBy } = req.query;
  const fromDate = from || new Date().toISOString().split('T')[0];
  const toDate = to || fromDate;

  try {
    let groupExpr, labelExpr;
    if (groupBy === 'month') {
      groupExpr = "DATE_FORMAT(entry_time, '%Y-%m')";
      labelExpr = "DATE_FORMAT(entry_time, '%b %Y')";
    } else if (groupBy === 'day') {
      groupExpr = 'DATE(entry_time)';
      labelExpr = 'DATE(entry_time)';
    } else {
      groupExpr = 'HOUR(entry_time)';
      labelExpr = "CONCAT(HOUR(entry_time), ':00')";
    }

    const [rows] = await pool.query(
      `SELECT ${groupExpr} as period, ${labelExpr} as label,
       COUNT(*) as total_vehicles,
       COUNT(CASE WHEN type = 'car' THEN 1 END) as cars,
       COUNT(CASE WHEN type = 'motorcycle' THEN 1 END) as motorcycles
       FROM vehicles
       WHERE DATE(entry_time) BETWEEN ? AND ?
       GROUP BY ${groupExpr}
       ORDER BY period`,
      [fromDate, toDate]
    );

    const [spaceSummary] = await pool.query(
      `SELECT type, COUNT(*) as total, SUM(status = 'occupied') as occupied
       FROM spaces GROUP BY type`
    );

    res.json({ success: true, data: rows, spaces: spaceSummary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { dailyIncome, occupancy };
