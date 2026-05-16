const router = require('express').Router();
const { getAll, getAvailable, create } = require('../controllers/spaceController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, getAll);
router.get('/available', verifyToken, getAvailable);
router.post('/', verifyToken, requireAdmin, create);

module.exports = router;
