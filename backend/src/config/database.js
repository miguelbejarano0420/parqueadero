const mysql = require('mysql2/promise');
require('dotenv').config();

// POOL DE CONEXIONES
// En lugar de abrir y cerrar una conexión por cada petición (lento y costoso),
// el pool mantiene hasta 10 conexiones abiertas y las reutiliza.
// waitForConnections: si todas están ocupadas, las peticiones hacen fila en vez de fallar.
// connectTimeout: si MySQL no responde en 10 segundos, la conexión se cancela.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parqueadero_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // timezone '-05:00': le dice a mysql2 que interprete los DATETIME como hora Colombia.
  // Sin esto, leería las horas guardadas como UTC y el frontend mostraría 5 horas menos.
  timezone: '-05:00',
  connectTimeout: 10000,
});

const underlying = pool.pool || pool;
if (typeof underlying.on === 'function') {
  // ZONA HORARIA POR CONEXIÓN
  // SET time_zone fuerza que NOW() y otras funciones de fecha en MySQL
  // devuelvan hora Colombia (UTC-5) en lugar de la hora del servidor (UTC).
  // Así lo que se guarda en la BD ya viene en hora Bogotá.
  underlying.on('connection', (conn) => {
    conn.query("SET time_zone = '-05:00'", (err) => {
      if (err) console.error('Error setting timezone:', err.message);
    });
  });

  // TOLERANCIA A FALLOS — RECONEXIÓN AUTOMÁTICA
  // Si una conexión del pool se cae (timeout de red, reinicio de Railway, etc.),
  // este evento captura el error y lo registra sin colapsar el proceso de Node.js.
  // El pool crea una nueva conexión automáticamente en la siguiente petición.
  underlying.on('error', (err) => {
    console.error('Pool error (reconexión automática en curso):', err.message);
  });
}

// TIMEOUT DE CONSULTA — 30 SEGUNDOS
// Envuelve cualquier función de consulta en una carrera contra el tiempo.
// Si la consulta tarda más de 30 segundos (BD sobrecargada, query lento),
// rechaza la promesa con un error claro en vez de dejar la petición colgada.
async function withTimeout(queryFn, label = 'query') {
  return Promise.race([
    queryFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de 30s superado en: ${label}`)), 30000)
    ),
  ]);
}

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    conn.release();
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection, withTimeout };
