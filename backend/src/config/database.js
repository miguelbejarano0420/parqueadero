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
});

// Forzar zona horaria Colombia en cada nueva conexión física del pool
const underlying = pool.pool || pool;
if (typeof underlying.on === 'function') {
  underlying.on('connection', (conn) => {
    conn.query("SET time_zone = '-05:00'", (err) => {
      if (err) console.error('Error setting timezone:', err.message);
    });
  });
}

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.query("SET time_zone = '-05:00'");
    console.log('✅ Conexión a MySQL establecida correctamente');
    conn.release();
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
