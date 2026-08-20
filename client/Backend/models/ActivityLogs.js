import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['guest', 'user', 'admin'], required: true },
  action: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('ActivityLog', activityLogSchema);