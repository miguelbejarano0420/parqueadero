const router = require('express').Router();
const { dailyIncome, occupancy } = require('../controllers/reportController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken, requireAdmin);

router.get('/daily', dailyIncome);
router.get('/occupancy', occupancy);

module.exports = router;
