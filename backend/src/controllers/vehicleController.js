const { pool } = require('../config/database');
const { detectVehicleType, formatPlate } = require('../utils/helpers');

// REGISTRO DE ENTRADA DE VEHÍCULO
// Operación crítica que usa una TRANSACCIÓN ACID completa para garantizar
// que nunca quede un vehículo registrado sin espacio asignado, ni un espacio
// ocupado sin vehículo. Si cualquier paso falla, rollback deshace todo.
async function registerEntry(req, res) {
  const { plate } = req.body;
  if (!plate) {
    return res.status(400).json({ success: false, message: 'Placa requerida' });
  }

  // Formatear y detectar tipo de vehículo por placa colombiana:
  // ABC-123 → carro | ABC-12A → moto
  const formattedPlate = formatPlate(plate);
  const vehicleType = detectVehicleType(plate);
  if (!vehicleType) {
    return res.status(400).json({ success: false, message: 'Placa colombiana inválida (ej: ABC-123 carro, ABC-12A moto)' });
  }

  // Obtener conexión dedicada del pool para la transacción
  const conn = await pool.getConnection();
  try {
    // INICIO DE TRANSACCIÓN ACID
    // Desde aquí, todas las operaciones son atómicas: o todas se confirman o ninguna.
    await conn.beginTransaction();

    // Verificar que el vehículo no esté ya adentro
    const [active] = await conn.query(
      "SELECT id FROM vehicles WHERE plate = ? AND exit_time IS NULL",
      [formattedPlate]
    );
    if (active.length > 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'El vehículo ya está en el parqueadero' });
    }

    // BLOQUEO PESIMISTA CON FOR UPDATE
    // Selecciona el primer espacio disponible Y lo bloquea para esta transacción.
    // Si dos operarios intentan registrar al mismo tiempo, el segundo espera
    // a que el primero termine. Esto evita asignar el mismo espacio dos veces.
    const [spaces] = await conn.query(
      "SELECT id, number FROM spaces WHERE type = ? AND status = 'available' ORDER BY number LIMIT 1 FOR UPDATE",
      [vehicleType]
    );
    if (spaces.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `No hay espacios disponibles para ${vehicleType === 'car' ? 'carros' : 'motos'}` });
    }

    const space = spaces[0];

    // Registrar el vehículo con NOW() — hora Colombia gracias al SET time_zone de la conexión
    const [result] = await conn.query(
      'INSERT INTO vehicles (plate, type, entry_time, space_id, operator_id) VALUES (?, ?, NOW(), ?, ?)',
      [formattedPlate, vehicleType, space.id, req.user.id]
    );

    // Marcar el espacio como ocupado
    await conn.query("UPDATE spaces SET status = 'occupied' WHERE id = ?", [space.id]);

    // Calcular ocupación total para emitir alertas al 90% y 100%
    const [summary] = await conn.query(
      "SELECT COUNT(*) as total, SUM(status = 'occupied') as occupied FROM spaces"
    );
    const { total, occupied } = summary[0];
    const pct = Math.round((occupied / total) * 100);

    // COMMIT: confirmar todas las operaciones en la BD de forma permanente
    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Vehículo registrado',
      data: { id: result.insertId, plate: formattedPlate, type: vehicleType, space: space.number, entryTime: new Date() },
      // Alertas de capacidad: nivel crítico al 100%, advertencia al 90%
      alert: pct >= 100 ? { level: 'critical', message: 'Parqueadero al 100% de capacidad' }
             : pct >= 90 ? { level: 'warning', message: `Parqueadero al ${pct}% de capacidad` }
             : null,
    });
  } catch (err) {
    // ROLLBACK: si algo falló, deshacer todo lo que se hizo en esta transacción
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error del servidor' });
  } finally {
    // Siempre devolver la conexión al pool, sin importar si hubo error o no
    conn.release();
  }
}

// LISTAR VEHÍCULOS ACTIVOS (sin fecha de salida)
// TIMESTAMPDIFF calcula los minutos transcurridos desde la entrada hasta ahora.
// Se usa en el frontend para mostrar el tiempo en tiempo real.
async function getActive(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, s.number as space_number,
       TIMESTAMPDIFF(MINUTE, v.entry_time, NOW()) as minutes_parked
       FROM vehicles v
       JOIN spaces s ON v.space_id = s.id
       WHERE v.exit_time IS NULL
       ORDER BY v.entry_time DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// BUSCAR VEHÍCULO POR PLACA (historial completo)
async function getByPlate(req, res) {
  const { plate } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT v.*, s.number as space_number, p.amount, p.payment_method, p.payment_time
       FROM vehicles v
       LEFT JOIN spaces s ON v.space_id = s.id
       LEFT JOIN payments p ON p.vehicle_id = v.id
       WHERE v.plate = ?
       ORDER BY v.entry_time DESC
       LIMIT 50`,
      [plate.toUpperCase()]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// HISTORIAL CON FILTROS (fecha, placa)
async function getHistory(req, res) {
  const { from, to, plate } = req.query;
  try {
    let query = `SELECT v.*, s.number as space_number, p.amount, p.payment_method
                 FROM vehicles v
                 LEFT JOIN spaces s ON v.space_id = s.id
                 LEFT JOIN payments p ON p.vehicle_id = v.id
                 WHERE 1=1`;
    const params = [];

    if (plate) { query += ' AND v.plate LIKE ?'; params.push(`%${plate}%`); }
    if (from) { query += ' AND v.entry_time >= ?'; params.push(from); }
    if (to) { query += ' AND v.entry_time <= ?'; params.push(to + ' 23:59:59'); }

    query += ' ORDER BY v.entry_time DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

// CONSULTAR VEHÍCULO PARA COBRO (pre-checkout)
// Devuelve el vehículo con el tiempo transcurrido y el total a cobrar
// para que el operario pueda informar al cliente antes de confirmar el pago.
async function getVehicleForExit(req, res) {
  const { plate } = req.params;
  const formattedPlate = formatPlate(plate);
  try {
    const [rows] = await pool.query(
      `SELECT v.*, s.number as space_number,
       TIMESTAMPDIFF(MINUTE, v.entry_time, NOW()) as minutes_parked,
       r.rate_per_hour
       FROM vehicles v
       JOIN spaces s ON v.space_id = s.id
       JOIN rates r ON r.vehicle_type = v.type AND r.active = 1
       WHERE v.plate = ? AND v.exit_time IS NULL`,
      [formattedPlate]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehículo no encontrado o ya salió' });
    }
    const v = rows[0];

    // CÁLCULO DE TARIFA POR FRACCIÓN DE HORA
    // Math.ceil redondea hacia arriba: 61 minutos = 2 fracciones, no 1.
    // Mínimo 1 fracción aunque el vehículo lleve menos de 60 minutos.
    const fractions = Math.max(Math.ceil(v.minutes_parked / 60), 1);
    const total = fractions * v.rate_per_hour;

    res.json({
      success: true,
      data: { ...v, fractions, total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}

module.exports = { registerEntry, getActive, getByPlate, getHistory, getVehicleForExit };
