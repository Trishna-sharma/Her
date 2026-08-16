// routes/admin.js
const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const ActiveSession = require('../models/ActiveSession');

router.get('/monitoring-dashboard', async (req, res) => {
  try {
    // Sessions active in the last 2 minutes are considered "Online"
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const activeSessions = await ActiveSession.find({ lastSeen: { $gte: twoMinutesAgo } });
    const recentLogs = await ActivityLog.find().sort({ timestamp: -1 }).limit(25);

    const activeUsersCount = activeSessions.filter((s) => s.role === 'user').length;
    const activeAdminsCount = activeSessions.filter((s) => s.role === 'admin').length;

    res.json({
      activeUsersCount,
      activeAdminsCount,
      activeSessions,
      history: recentLogs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch monitoring data' });
  }
});

module.exports = router;