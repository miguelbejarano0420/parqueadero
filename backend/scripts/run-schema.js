const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSchema() {
  try {
    // Leer el archivo schema.sql
    let schema = fs.readFileSync('./database/schema.sql', 'utf8');

    // Reemplazar parqueadero_db con el nombre de la base de datos actual
    schema = schema.replace(/parqueadero_db/g, process.env.DB_NAME);

    // Conectar a la base de datos actual
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      multipleStatements: true,
    });

    console.log('📡 Conectando a Railway...');
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Base de datos: ${process.env.DB_NAME}`);

    // Ejecutar el schema
    console.log('⏳ Ejecutando schema...');
    const [results] = await connection.query(schema);

    console.log('✅ ¡Schema ejecutado exitosamente!');
    console.log('✅ Base de datos lista para usar');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error ejecutando schema:', err.message);
    process.exit(1);
  }
}

runSchema();
