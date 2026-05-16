const router = require('express').Router();
const { registerPaymentAndExit, getHistory } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/checkout', registerPaymentAndExit);
router.get('/history', getHistory);

module.exports = router;
