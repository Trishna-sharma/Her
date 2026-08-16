// models/ActiveSession.js
const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'admin'], required: true },
  lastSeen: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActiveSession', activeSessionSchema);