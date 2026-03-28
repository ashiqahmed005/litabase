const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const ctrl         = require('../controllers/connectionController');

router.use(authenticate);

router.get('/',          asyncHandler(ctrl.list));
router.post('/',         requireRole('admin', 'editor'), asyncHandler(ctrl.create));
router.post('/:id/test', asyncHandler(ctrl.test));
router.put('/:id',       requireRole('admin', 'editor'), asyncHandler(ctrl.update));
router.delete('/:id',    requireRole('admin'),            asyncHandler(ctrl.remove));

module.exports = router;
