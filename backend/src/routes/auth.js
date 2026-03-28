const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const asyncHandler    = require('../middleware/asyncHandler');
const ctrl            = require('../controllers/authController');

router.post('/register', asyncHandler(ctrl.register));
router.post('/login',    asyncHandler(ctrl.login));
router.get('/me',        authenticate, asyncHandler(ctrl.me));

module.exports = router;
