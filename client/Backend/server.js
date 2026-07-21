import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configure directory path for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables from backend.env
dotenv.config({ path: path.join(__dirname, 'backend.env') });

import User from './user.js';

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const corsAllowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhost || corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const issueToken = (user) => jwt.sign(
  { userId: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;

  try {
    // Verify token with Google Auth Library
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Fast check for existing user
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        googleId,
        email,
        name,
        picture,
        isGoogleUser: true,
      });
      await user.save();
      console.log('✨ New user saved:', email);
    }

    // Return successful login token & user object
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const safeEmail = String(email || '').trim().toLowerCase();
    const safePassword = String(password || '');

    if (!safeEmail || !safePassword) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: safeEmail });
    if (!user || !user.passwordHash) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const valid = await bcrypt.compare(safePassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = issueToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

// 3. Google OAuth API Route
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;

  try {
    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Find existing user or create a new entry
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = await User.create({ googleId, email, name, picture });
      console.log('✨ New user created in MongoDB:', user.email);
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.name && name) user.name = name;
      if (!user.picture && picture) user.picture = picture;
      await user.save();
    }

    const token = issueToken(user);

    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ message: 'Google Auth Failed', error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

// At the bottom of server.js
export default app; 
// or: module.exports = app; (depending on your module type)