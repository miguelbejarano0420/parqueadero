const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

const NEW_PASSWORD = 'admin123';

async function resetAdmin() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  console.log('\nHash generado:', hash);

  const [result] = await pool.query(
    "UPDATE users SET password_hash = ? WHERE username = 'admin'",
    [hash]
  );

  if (result.affectedRows === 0) {
    // Si no existe, lo inserta
    await pool.query(
      "INSERT INTO users (username, password_hash, name, email, role) VALUES ('admin', ?, 'Administrador', 'admin@parqueadero.com', 'admin')",
      [hash]
    );
    console.log('✅ Usuario admin CREADO con contraseña:', NEW_PASSWORD);
  } else {
    console.log('✅ Contraseña del admin actualizada a:', NEW_PASSWORD);
  }

  process.exit(0);
}

resetAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
