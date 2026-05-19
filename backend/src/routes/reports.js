const router = require('express').Router();
const { dailyIncome, occupancy } = require('../controllers/reportController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Los reportes son información financiera sensible — solo accesibles para admin.
// El frontend también protege /reports con adminOnly en PrivateRoute (doble capa).
router.use(verifyToken, requireAdmin);

// GET /api/reports/daily?date=YYYY-MM-DD   — ingresos del día con desglose por hora
// GET /api/reports/occupancy?from=&to=      — entradas por día en un rango de fechas
router.get('/daily',     dailyIncome);
router.get('/occupancy', occupancy);

module.exports = router;
