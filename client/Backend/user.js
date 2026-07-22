import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  googleId: { type: String },
  isVerified: { type: Boolean, default: false }, // 👈 Track verification status
  otp: { type: String },                         // 👈 Store current OTP
  otpExpiresAt: { type: Date },                 // 👈 Store expiration time
});

export default mongoose.model('User', userSchema, 'User datas');