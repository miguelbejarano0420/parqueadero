const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');

const authRoutes    = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const spaceRoutes   = require('./routes/spaces');
const paymentRoutes = require('./routes/payments');
const reportRoutes  = require('./routes/reports');
const userRoutes    = require('./routes/users');
const rateRoutes    = require('./routes/rates');

const app  = express();
const PORT = process.env.PORT || 3001;

// POLÍTICA CORS (Cross-Origin Resource Sharing)
// El navegador bloquea peticiones entre dominios distintos por seguridad.
// Aquí se define una lista blanca de orígenes permitidos:
// - localhost:5173 para desarrollo local con Vite
// - las URLs de Vercel donde está desplegado el frontend
// Cualquier origen fuera de esta lista recibe un error CORS y la petición se cancela.
const allowedOrigins = [
  'http://localhost:5173',
  'https://parqueadero-git-main-miguelbejarano0420s-projects.vercel.app',
  process.env.FRONTEND_URL, // URL de producción en Vercel, cargada desde variable de entorno
].filter(Boolean); // Elimina valores undefined si la variable de entorno no está definida

app.use(cors({
  origin: (origin, callback) => {
    // !origin permite peticiones sin origen (Postman, curl, servidor a servidor)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS no permitido'));
  },
  credentials: true, // Permite enviar cookies y headers de autorización
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// RATE LIMITING — TOLERANCIA A FALLOS POR SOBRECARGA
// Limita cuántas peticiones puede hacer una misma IP en un período de tiempo.
// Protege el servidor contra ataques de fuerza bruta y sobrecarga accidental.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 100,                  // Máximo 100 peticiones por IP en esa ventana
  standardHeaders: true,     // Incluir headers RateLimit-* en la respuesta
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta en 15 minutos' },
});

// Límite más estricto solo para el login:
// 10 intentos en 15 minutos — protege contra ataques de contraseñas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión, intenta en 15 minutos' },
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter); // authLimiter se aplica ANTES que authRoutes

// REGISTRO DE RUTAS
// Cada módulo tiene su propio archivo de rutas con sus validaciones y middlewares.
// El prefijo /api/ separa la API del backend de cualquier recurso estático.
app.use('/api/auth',     authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/spaces',   spaceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports',  reportRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/rates',    rateRoutes);

// HEALTH CHECK
// Endpoint público que permite verificar si el servidor está activo.
// Útil para monitoreo en Render y para pruebas en Postman antes de cualquier otra cosa.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MANEJADOR GLOBAL DE ERRORES
// Captura cualquier error que no fue manejado en los controladores.
// El cuarto parámetro (err) es lo que distingue este middleware de los normales.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

// INICIO DEL SERVIDOR
// testConnection verifica que la base de datos responde antes de aceptar peticiones.
// Si la BD no está disponible, el proceso termina con process.exit(1).
app.listen(PORT, async () => {
  await testConnection();
  console.log(`🚗 Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
