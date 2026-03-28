const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const ctrl         = require('../controllers/scheduleController');

router.use(authenticate);

router.get('/',          asyncHandler(ctrl.list));
router.post('/',         requireRole('admin', 'editor'), asyncHandler(ctrl.create));
router.put('/:id',       requireRole('admin', 'editor'), asyncHandler(ctrl.update));
router.delete('/:id',    requireRole('admin'),            asyncHandler(ctrl.remove));
router.post('/:id/run',  requireRole('admin', 'editor'), asyncHandler(ctrl.run));

module.exports = router;
