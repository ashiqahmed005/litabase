const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const ctrl         = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/',                          asyncHandler(ctrl.list));
router.get('/:id',                       asyncHandler(ctrl.findOne));
router.post('/',                         requireRole('admin', 'editor'), asyncHandler(ctrl.create));
router.put('/:id',                       requireRole('admin', 'editor'), asyncHandler(ctrl.update));
router.delete('/:id',                    requireRole('admin', 'editor'), asyncHandler(ctrl.remove));
router.post('/:id/widgets',              requireRole('admin', 'editor'), asyncHandler(ctrl.addWidget));
router.put('/:id/widgets/:widgetId',     requireRole('admin', 'editor'), asyncHandler(ctrl.updateWidget));
router.delete('/:id/widgets/:widgetId',  requireRole('admin', 'editor'), asyncHandler(ctrl.removeWidget));

module.exports = router;
