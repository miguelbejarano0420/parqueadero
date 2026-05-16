const router = require('express').Router();
const { login, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/profile', verifyToken, getProfile);

module.exports = router;
