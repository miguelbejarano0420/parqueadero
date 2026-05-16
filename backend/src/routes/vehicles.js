const router = require('express').Router();
const { registerEntry, getActive, getByPlate, getHistory, getVehicleForExit } = require('../controllers/vehicleController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/entry', registerEntry);
router.get('/active', getActive);
router.get('/history', getHistory);
router.get('/exit/:plate', getVehicleForExit);
router.get('/:plate', getByPlate);

module.exports = router;
