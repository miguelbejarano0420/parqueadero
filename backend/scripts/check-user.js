// Uso: node scripts/check-user.js <username> <password>
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.log('Uso: node scripts/check-user.js <username> <password>');
  process.exit(1);
}

async function check() {
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

  if (!rows.length) {
    console.log('❌ Usuario NO existe en la base de datos');
    process.exit(0);
  }

  const user = rows[0];
  console.log('\n--- Usuario encontrado ---');
  console.log('ID:       ', user.id);
  console.log('Username: ', JSON.stringify(user.username));
  console.log('Name:     ', user.name);
  console.log('Role:     ', user.role);
  console.log('Active:   ', user.active);
  console.log('Hash:     ', user.password_hash);

  const valid = await bcrypt.compare(password, user.password_hash);
  console.log('\n--- Verificación de contraseña ---');
  console.log('Contraseña probada:', JSON.stringify(password));
  console.log('Resultado:', valid ? '✅ CORRECTA' : '❌ INCORRECTA');

  if (!valid) {
    console.log('\nPosibles causas:');
    console.log('- La contraseña fue escrita diferente al crearla');
    console.log('- Hay espacios al inicio/fin en el campo de contraseña');
  }

  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
