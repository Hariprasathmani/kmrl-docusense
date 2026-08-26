const express = require('express');
const { getDashboardStats, getAnalyticsStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/dashboard/stats — All authenticated users
router.get('/stats', getDashboardStats);

// GET /api/dashboard/analytics — Admin only
router.get('/analytics', authorize('Admin'), getAnalyticsStats);

module.exports = router;
