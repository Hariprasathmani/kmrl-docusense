const express = require('express');
const { getAnalyticsStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/analytics — Admin only
router.get('/', authorize('Admin'), getAnalyticsStats);
router.get('/stats', authorize('Admin'), getAnalyticsStats);

module.exports = router;
