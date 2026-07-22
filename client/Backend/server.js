import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Configure directory path for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables
dotenv.config({ path: path.join(__dirname, 'backend.env') });

import User from './user.js';

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(express.json());

// CORS Setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://her-by-mou-frontend.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) {
      return callback(null, true);
    }

    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Helper function to issue JWT tokens
const issueToken = (user) => jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '7d' }
);

// --- ROUTES ---

// Manual Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const safeEmail = String(email || '').trim().toLowerCase();
    const safePassword = String(password || '');

    if (!safeEmail || !safePassword) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: safeEmail });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(safePassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = issueToken(user);
    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

// Google OAuth Route
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = new User({
        googleId,
        email,
        name,
        picture,
        isGoogleUser: true,
      });
      await user.save();
      console.log('✨ New user saved to MongoDB:', email);
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.name && name) user.name = name;
      if (!user.picture && picture) user.picture = picture;
      await user.save();
    }

    const token = issueToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('Google Auth Route Error:', error);
    return res.status(400).json({ error: error.message || 'Google login failed' });
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send OTP email
const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"HER" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Account Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Verify Your Email</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #4CAF50; letter-spacing: 4px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  });
};

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const safeEmail = String(email || '').trim().toLowerCase();

    if (!safeEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes valid

    let user = await User.findOne({ email: safeEmail });
    if (!user) {
      user = new User({ email: safeEmail, name: 'Pending User' });
    }

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    await sendOtpEmail(safeEmail, otp);

    return res.status(200).json({ message: 'OTP sent successfully to your email!' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Failed to send OTP.', error: error.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    const safeEmail = String(email || '').trim().toLowerCase();

    const user = await User.findOne({ email: safeEmail });
    if (!user || user.otp !== otp || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Mark user as verified and save password hash
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    if (name) user.name = name;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }
    await user.save();

    const token = issueToken(user);

    return res.status(200).json({
      message: 'Account verified successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ message: 'OTP verification failed.', error: error.message });
  }
});

// Start Server locally if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;