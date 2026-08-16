// routes/auth.js
const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const ActiveSession = require('../models/ActiveSession');

// Helper to record login history & mark session online
const registerSession = async (email, role, req) => {
  // 1. Save activity history
  await ActivityLog.create({
    email,
    role,
    action: 'LOGIN',
    ipAddress: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
  });

  // 2. Upsert active session
  await ActiveSession.findOneAndUpdate(
    { email },
    { role, lastSeen: new Date() },
    { upsert: true, new: true }
  );
};

// User Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // --- Validate user password logic here ---
  
  await registerSession(email, 'user', req);
  res.json({ message: 'User login successful', token: 'sample-user-token', user: { email, role: 'user' } });
});

// Admin Login Route
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  // --- Validate admin password logic here ---

  await registerSession(email, 'admin', req);
  res.json({ message: 'Admin login successful', token: 'sample-admin-token', user: { email, role: 'admin' } });
});

// Heartbeat endpoint called by frontend every 30s
router.post('/heartbeat', async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  await ActiveSession.findOneAndUpdate(
    { email },
    { role: role || 'user', lastSeen: new Date() },
    { upsert: true }
  );

  res.json({ status: 'ok' });
});

module.exports = router;