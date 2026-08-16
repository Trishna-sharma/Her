// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], required: true },
  action: { type: String, required: true }, // 'LOGIN', 'LOGOUT', 'FAILED_LOGIN'
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);