const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const ctrl         = require('../controllers/queryController');

router.use(authenticate);

// /run must be declared before /:id to prevent Express matching "run" as an id param
router.post('/run',      asyncHandler(ctrl.runAdHoc));

router.get('/',          asyncHandler(ctrl.list));
router.get('/:id',       asyncHandler(ctrl.findOne));
router.post('/',         requireRole('admin', 'editor'), asyncHandler(ctrl.create));
router.put('/:id',       requireRole('admin', 'editor'), asyncHandler(ctrl.update));
router.delete('/:id',    requireRole('admin', 'editor'), asyncHandler(ctrl.remove));
router.post('/:id/run',  asyncHandler(ctrl.runSaved));

module.exports = router;
