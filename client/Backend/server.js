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

import User from './user.js';

// Configure directory path for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables locally
dotenv.config({ path: path.join(__dirname, 'backend.env') });

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
    if (!origin) return callback(null, true);

    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// --- EMAIL NORMALIZATION HELPER ---
// Converts: "trishnasharma.2.0.0.2+alias@gmail.com" -> "trishnasharma2002@gmail.com"
const normalizeEmail = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  
  let email = rawEmail.trim().toLowerCase();
  const parts = email.split('@');
  
  if (parts.length !== 2) return email;

  let [local, domain] = parts;

  // Handle Gmail / Googlemail dot and plus alias removal
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');       // Remove all dots
    local = local.split('+')[0];             // Remove everything after '+'
    domain = 'gmail.com';
  } else {
    // For other domains, only remove plus aliases
    local = local.split('+')[0];
  }

  return `${local}@${domain}`;
};

// --- SERVERLESS MONGODB CONNECTION CACHING ---
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
      console.log('✅ MongoDB Connected Successfully!');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB Connection Error:', e);
    throw e;
  }

  return cached.conn;
}

// --- HELPER FUNCTIONS ---
const issueToken = (user) => jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '7d' }
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"HER" <${process.env.EMAIL_USER}>`,
    to: email, // Sends to the exact address typed by user
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

// --- ROUTES ---

// 1. Manual Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();

    const { email, password } = req.body;
    const normalized = normalizeEmail(email);
    const safePassword = String(password || '');

    if (!normalized || !safePassword) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Search by normalized email or exact email
    const user = await User.findOne({
      $or: [{ email: normalized }, { email: String(email).trim().toLowerCase() }]
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(safePassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = issueToken(user);
    return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

// 2. Google OAuth Route
app.post('/api/auth/google', async (req, res) => {
  try {
    await connectDB();

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is missing.' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    const normalized = normalizeEmail(email);

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({
        $or: [{ email: normalized }, { email: String(email).trim().toLowerCase() }]
      });
    }

    if (!user) {
      user = new User({
        googleId,
        email: normalized, // Save as normalized email
        name,
        picture,
        isGoogleUser: true,
        isVerified: true,
      });
      await user.save();
      console.log('✨ New Google user saved to MongoDB:', normalized);
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.name && name) user.name = name;
      if (!user.picture && picture) user.picture = picture;
      user.isVerified = true;
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

// 3. Send OTP Route (WITH GMAIL / ALIAS DUPLICATE CHECK)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    await connectDB();

    const { email } = req.body;
    const rawEmail = String(email || '').trim().toLowerCase();
    const normalized = normalizeEmail(email);

    if (!rawEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Query both raw email and normalized email
    const existingUser = await User.findOne({
      $or: [{ email: normalized }, { email: rawEmail }]
    });

    // Reject request if ANY matching account exists
    if (existingUser) {
      if (existingUser.isVerified || existingUser.passwordHash || existingUser.googleId) {
        return res.status(400).json({
          message: 'An account with this email address already exists. Please log in.',
        });
      }
    }

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    let user = existingUser;
    if (!user) {
      user = new User({ email: normalized, name: 'Pending User', isVerified: false });
    }

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send to the exact raw address typed in the UI so the user receives it
    await sendOtpEmail(rawEmail, otp);

    return res.status(200).json({ message: 'OTP sent successfully to your email!' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Failed to send OTP.', error: error.message });
  }
});

// 4. Verify OTP Route
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    await connectDB();

    const { email, otp, name, password } = req.body;
    const rawEmail = String(email || '').trim().toLowerCase();
    const normalized = normalizeEmail(email);
    const safeOtp = String(otp || '').trim();

    const user = await User.findOne({
      $or: [{ email: normalized }, { email: rawEmail }]
    });

    if (!user || user.otp !== safeOtp || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

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
    console.error('Verify OTP Error:', error);
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