const { pool } = require('../config/database');

// Retorna la fecha actual en zona horaria Colombia (formato YYYY-MM-DD)
// Se usa como valor por defecto cuando el usuario no especifica fecha en la consulta
function colombiaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

// REPORTE DE INGRESOS DIARIOS
// Agrupa todos los pagos de un día específico y devuelve:
// - Resumen total con desglose por tipo de vehículo y método de pago
// - Distribución de pagos por hora del día (para identificar horas pico)
// - Lista detallada de cada transacción del día
async function dailyIncome(req, res) {
  const targetDate = req.query.date || colombiaToday();

  try {
    // RESUMEN FINANCIERO DEL DÍA
    // Usa COALESCE para retornar 0 en vez de NULL si no hay pagos.
    // CASE WHEN filtra por tipo de vehículo y método de pago dentro del mismo SELECT,
    // evitando múltiples consultas a la BD.
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

    // INGRESOS POR HORA
    // Permite identificar las horas de mayor y menor actividad.
    // El frontend lo convierte en la gráfica de barras del reporte.
    const [byHour] = await pool.query(
      `SELECT HOUR(p.payment_time) as hour, COUNT(*) as count, SUM(p.amount) as income
       FROM payments p
       WHERE DATE(p.payment_time) = ?
       GROUP BY HOUR(p.payment_time)
       ORDER BY hour`,
      [targetDate]
    );

    // DETALLE DE TRANSACCIONES
    // Lista completa del día para que el administrador pueda auditar cada cobro.
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
    console.error('dailyIncome error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// REPORTE DE OCUPACIÓN POR RANGO DE FECHAS
// Muestra cuántos vehículos ingresaron cada día en el rango seleccionado,
// desglosados por tipo (carros y motos). También devuelve el estado actual
// de los espacios (ocupados vs disponibles) en tiempo real.
async function occupancy(req, res) {
  const fromDate = req.query.from || colombiaToday();
  const toDate   = req.query.to   || fromDate;

  try {
    // Agrupar entradas por día
    // DATE_FORMAT devuelve string de fecha (no objeto Date) para evitar
    // problemas de serialización. MIN() en label resuelve el strict mode
    // ONLY_FULL_GROUP_BY de Railway que requiere que columnas no agrupadas
    // usen funciones de agregación.
    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(entry_time, '%Y-%m-%d')      as period,
         MIN(DATE_FORMAT(entry_time, '%d/%m/%Y')) as label,
         COUNT(*)                                  as total_vehicles,
         COUNT(CASE WHEN type = 'car' THEN 1 END)        as cars,
         COUNT(CASE WHEN type = 'motorcycle' THEN 1 END) as motorcycles
       FROM vehicles
       WHERE DATE(entry_time) BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(entry_time, '%Y-%m-%d')
       ORDER BY period`,
      [fromDate, toDate]
    );

    // Estado actual de espacios (tiempo real)
    // SUM(status = 'occupied') cuenta los registros donde la condición es verdadera (MySQL retorna 1/0)
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
