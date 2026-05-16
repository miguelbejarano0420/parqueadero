const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifySchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    console.log('📡 Conectado a Railway');

    // Verificar tablas
    const [tables] = await connection.query("SHOW TABLES");
    console.log('\n📋 Tablas en la base de datos:');
    tables.forEach(table => {
      const tableName = table[`Tables_in_${process.env.DB_NAME}`];
      console.log(`   ✓ ${tableName}`);
    });

    // Verificar usuario admin
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    console.log('\n👤 Usuario admin:');
    if (rows.length) {
      console.log(`   ✓ Existe: ${rows[0].name} (${rows[0].role})`);
    } else {
      console.log('   ✗ No existe');
    }

    await connection.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

verifySchema();
