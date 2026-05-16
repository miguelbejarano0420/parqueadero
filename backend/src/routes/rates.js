const router = require('express').Router();
const { getAll, update } = require('../controllers/rateController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, getAll);
router.put('/:id', verifyToken, requireAdmin, update);

module.exports = router;
