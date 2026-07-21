import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    googleId: { type: String },
    picture: { type: String },
    isGoogleUser: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema, 'User datas');