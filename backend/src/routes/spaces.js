const router = require('express').Router();
const { getAll, getAvailable, create } = require('../controllers/spaceController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/spaces           — listado completo (admin y operario para ver ocupación)
// GET /api/spaces/available — solo espacios libres del tipo indicado (usado al registrar entrada)
// POST /api/spaces          — agregar nuevos espacios (solo admin, operación infrecuente)
router.get('/',           verifyToken, getAll);
router.get('/available',  verifyToken, getAvailable);
router.post('/',          verifyToken, requireAdmin, create);

module.exports = router;
