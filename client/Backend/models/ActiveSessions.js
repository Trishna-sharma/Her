import mongoose from 'mongoose';

const activeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  email: { type: String, default: 'Guest' },
  role: { type: String, enum: ['guest', 'user', 'admin'], default: 'guest' },
  page: { type: String, default: 'welcome' },
  userAgent: { type: String },
  lastSeen: { type: Date, default: Date.now },
});

export default mongoose.model('ActiveSession', activeSessionSchema);