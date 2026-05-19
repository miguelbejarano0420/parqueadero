const { pool } = require('../config/database');
const { formatPlate } = require('../utils/helpers');

// REGISTRO DE PAGO Y SALIDA DEL VEHÍCULO
// Segunda operación crítica con transacción ACID.
// Encadena tres tablas en una sola operación atómica:
// 1. Calcula el monto final según tiempo real de permanencia
// 2. Inserta el registro de pago en la tabla payments
// 3. Actualiza el vehículo con hora de salida y referencia al pago
// 4. Libera el espacio para que esté disponible de inmediato
// Si cualquier paso falla, rollback garantiza que no queden datos inconsistentes.
async function registerPaymentAndExit(req, res) {
  const { plate, paymentMethod } = req.body;

  if (!plate || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'Placa y método de pago requeridos' });
  }
  if (!['cash', 'card', 'app'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Método de pago inválido (cash, card, app)' });
  }

  const formattedPlate = formatPlate(plate);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Buscar el vehículo activo y calcular tiempo transcurrido
    // FOR UPDATE bloquea el registro para evitar que dos peticiones
    // simultáneas cobren el mismo vehículo dos veces
    const [vehicles] = await conn.query(
      `SELECT v.*, r.rate_per_hour,
       TIMESTAMPDIFF(MINUTE, v.entry_time, NOW()) as minutes_parked
       FROM vehicles v
       JOIN rates r ON r.vehicle_type = v.type AND r.active = 1
       WHERE v.plate = ? AND v.exit_time IS NULL FOR UPDATE`,
      [formattedPlate]
    );

    if (vehicles.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado o ya registró salida' });
    }

    const vehicle = vehicles[0];

    // CÁLCULO DE TARIFA POR FRACCIÓN DE HORA
    // Ejemplo: 2h 15min = 135 minutos → Math.ceil(135/60) = 3 fracciones
    // Mínimo cobro: 1 fracción (aunque el vehículo salga a los 5 minutos)
    const fractions = Math.max(Math.ceil(vehicle.minutes_parked / 60), 1);
    const amount = fractions * vehicle.rate_per_hour;

    // Hora de salida en tiempo real
    const exitTime = new Date();

    // PASO 1: Insertar el pago
    const [payResult] = await conn.query(
      'INSERT INTO payments (vehicle_id, amount, payment_method, payment_time, operator_id) VALUES (?, ?, ?, ?, ?)',
      [vehicle.id, amount, paymentMethod, exitTime, req.user.id]
    );

    // PASO 2: Registrar salida en el vehículo y vincular al pago creado
    await conn.query(
      'UPDATE vehicles SET exit_time = ?, payment_id = ? WHERE id = ?',
      [exitTime, payResult.insertId, vehicle.id]
    );

    // PASO 3: Liberar el espacio para que otros vehículos puedan entrar
    await conn.query("UPDATE spaces SET status = 'available' WHERE id = ?", [vehicle.space_id]);

    await conn.commit();

    // Ticket completo con todos los datos de la operación para mostrar al cliente
    res.json({
      success: true,
      message: 'Pago registrado y salida habilitada',
      ticket: {
        plate: vehicle.plate,
        type: vehicle.type,
        entryTime: vehicle.entry_time,
        exitTime,
        minutes: vehicle.minutes_parked,
        fractions,
        ratePerHour: vehicle.rate_per_hour,
        amount,
        paymentMethod,
        paymentId: payResult.insertId,
        operatorId: req.user.id,
        operatorName: req.user.name,
      },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error del servidor' });
  } finally {
    conn.release();
  }
}

// HISTORIAL DE PAGOS CON FILTRO POR FECHAS
async function getHistory(req, res) {
  const { from, to } = req.query;
  try {
    let query = `SELECT p.*, v.plate, v.type, v.entry_time, v.exit_time, u.name as operator_name
                 FROM payments p
                 JOIN vehicles v ON p.vehicle_id = v.id
                 JOIN users u ON p.operator_id = u.id
                 WHERE 1=1`;
    const params = [];
    if (from) { query += ' AND p.payment_time >= ?'; params.push(from); }
    if (to) { query += ' AND p.payment_time <= ?'; params.push(to + ' 23:59:59'); }
    query += ' ORDER BY p.payment_time DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { registerPaymentAndExit, getHistory };
