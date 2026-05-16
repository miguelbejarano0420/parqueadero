const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parqueadero_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  connectTimeout: 10000,
});

// Tolerancia a fallos: loguear errores del pool sin colapsar el proceso
const underlying = pool.pool || pool;
if (typeof underlying.on === 'function') {
  underlying.on('error', (err) => {
    console.error('Pool error (reconexión automática en curso):', err.message);
  });
}

// Envuelve cualquier consulta en un timeout de 30 segundos
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
