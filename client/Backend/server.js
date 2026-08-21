import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

import ActiveSession from './models/ActiveSession.js';
import ActivityLog from './models/ActivityLog.js';
import User from './user.js';
import cloudinary from './cloudinary.js';

// --- ENVIRONMENT & APP INITIALIZATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'backend.env') });

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- MULTER CONFIGURATION ---
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
  },
});

// --- MIDDLEWARE ---
app.use(express.json());

// CORS Setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://bella-liliac.vercel.app',
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
const normalizeEmail = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  
  let email = rawEmail.trim().toLowerCase();
  const parts = email.split('@');
  
  if (parts.length !== 2) return email;

  let [local, domain] = parts;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
    local = local.split('+')[0];
    domain = 'gmail.com';
  } else {
    local = local.split('+')[0];
  }

  return `${local}@${domain}`;
};

// --- MONGODB CONNECTION CACHING ---
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
const issueToken = (user, role = 'user') => jwt.sign(
  { id: user._id || null, email: user.email, role },
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

function generateOrderCode() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// --- AUTH MIDDLEWARE ---
async function attachUserIfPresent(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = payload.id || null;
    req.userEmail = payload.email;
    req.userRole = payload.role || 'user';
  } catch {
    // invalid/expired token — treat as guest, don't block
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.userEmail) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}


// --- ROUTES ---

// 1. Live Tracking & Monitoring
app.post('/api/auth/heartbeat', async (req, res) => {
  try {
    await connectDB();
    const { sessionId, role, page, email, userAgent } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    await ActiveSession.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        role: role || 'guest',
        page: page || 'welcome',
        email: email || 'Guest',
        userAgent: userAgent || req.headers['user-agent'],
        lastSeen: new Date(),
      },
      { upsert: true }
    );

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Heartbeat Error:', error);
    return res.status(500).json({ message: 'Heartbeat failed.' });
  }
});

app.get('/api/admin/monitoring-dashboard', async (req, res) => {
  try {
    await connectDB();
    const cutoff = new Date(Date.now() - 30 * 1000); // active in last 30s

    const sessions = await ActiveSession.find({ lastSeen: { $gte: cutoff } }).lean();

    const summary = {
      totalActive: sessions.length,
      admins: sessions.filter((s) => s.role === 'admin').length,
      registeredUsers: sessions.filter((s) => s.role === 'user').length,
      guests: sessions.filter((s) => s.role === 'guest').length,
    };

    return res.json({ summary, activeSessions: sessions });
  } catch (error) {
    console.error('Monitoring Dashboard Error:', error);
    return res.status(500).json({ message: 'Failed to fetch monitoring data.' });
  }
});

// 2. Cloudinary Upload Routes
app.get('/api/uploads/cloudinary-signature', (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'her-by-mou/items';
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  return res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  });
});

app.post('/api/uploads/image', (req, res) => {
  uploadImage.single('image')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image must be 10MB or smaller.' });
      }
      return res.status(400).json({ message: error.message || 'Upload failed.' });
    }

    if (error) {
      return res.status(400).json({ message: error.message || 'Upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'her-by-mou/items',
        resource_type: 'image',
      },
      (uploadError, result) => {
        if (uploadError) {
          return res.status(500).json({
            message: 'Cloudinary upload failed.',
            error: uploadError.message,
          });
        }

        return res.status(201).json({
          message: 'Image uploaded successfully.',
          url: result?.secure_url,
          publicId: result?.public_id,
          filename: req.file.originalname,
          size: req.file.size,
        });
      }
    );

    stream.end(req.file.buffer);
  });
});

// 3. Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();

    const { email, password } = req.body;
    const normalized = normalizeEmail(email);
    const safePassword = String(password || '');

    if (!normalized || !safePassword) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

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

// Admin login — credentials live server-side only, never in frontend code
app.post('/api/auth/admin-login', async (req, res) => {
  const { email, password } = req.body;
  const normalized = String(email || '').trim().toLowerCase();
  const safePassword = String(password || '');

  const adminCredentials = {
    'mou@bella.com': process.env.ADMIN_PASSWORD_MOU || '12121212',
    'huma@bella.com': process.env.ADMIN_PASSWORD_HUMA || '12121212',
  };

  if (!adminCredentials[normalized] || adminCredentials[normalized] !== safePassword) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  const token = issueToken({ email: normalized }, 'admin');
  return res.json({ token, user: { email: normalized, name: 'Admin', role: 'admin' } });
});

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
        email: normalized,
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

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    await connectDB();

    const { email } = req.body;
    const rawEmail = String(email || '').trim().toLowerCase();
    const normalized = normalizeEmail(email);

    if (!rawEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalized }, { email: rawEmail }]
    });

    if (existingUser) {
      if (existingUser.isVerified || existingUser.passwordHash || existingUser.googleId) {
        return res.status(400).json({
          message: 'An account with this email address already exists. Please log in.',
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user = existingUser;
    if (!user) {
      user = new User({ email: normalized, name: 'Pending User', isVerified: false });
    }

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    await sendOtpEmail(rawEmail, otp);

    return res.status(200).json({ message: 'OTP sent successfully to your email!' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Failed to send OTP.', error: error.message });
  }
});

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

// 4. Order Management Routes
app.post('/api/orders', attachUserIfPresent, async (req, res) => {
  try {
    await connectDB();
    const { items = [], subtotal = 0 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must include at least one item.' });
    }

    const order = await Order.create({
      orderCode: generateOrderCode(),
      customerEmail: req.userEmail || null,
      customerName: req.userEmail ? req.userEmail.split('@')[0] : null,
      userId: req.userId || null,
      items,
      subtotal,
      status: 'pending',
    });

    return res.status(201).json({ order });
  } catch (error) {
    console.error('Create Order Error:', error);
    return res.status(500).json({ message: 'Failed to create order.', error: error.message });
  }
});

app.get('/api/orders/mine', attachUserIfPresent, requireAuth, async (req, res) => {
  try {
    await connectDB();
    const orders = await Order.find({ customerEmail: req.userEmail })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ orders });
  } catch (error) {
    console.error('Get My Orders Error:', error);
    return res.status(500).json({ message: 'Failed to load orders.' });
  }
});

app.get('/api/orders', attachUserIfPresent, requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const orders = await Order.find({ isArchived: false }).sort({ createdAt: -1 }).lean();
    return res.json({ orders });
  } catch (error) {
    console.error('List Orders Error:', error);
    return res.status(500).json({ message: 'Failed to load orders.' });
  }
});

app.patch('/api/orders/:orderCode/status', attachUserIfPresent, requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const { status, statusNote } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderCode: req.params.orderCode },
      { status, statusNote: statusNote || '' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.json({ order });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    return res.status(500).json({ message: 'Failed to update order.' });
  }
});

app.patch('/api/orders/:orderCode/archive', attachUserIfPresent, requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findOneAndUpdate(
      { orderCode: req.params.orderCode },
      { isArchived: true },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.json({ order });
  } catch (error) {
    console.error('Archive Order Error:', error);
    return res.status(500).json({ message: 'Failed to archive order.' });
  }
});

app.patch('/api/orders/:orderCode/rate', attachUserIfPresent, requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { cartId, rating } = req.body;
    const order = await Order.findOne({ orderCode: req.params.orderCode, customerEmail: req.userEmail });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Order must be delivered before rating.' });
    }

    const item = order.items.find((i) => i.cartId === cartId);
    if (!item) return res.status(404).json({ message: 'Item not found in order.' });

    item.userRating = Number(rating);
    await order.save();

    return res.json({ order });
  } catch (error) {
    console.error('Rate Order Item Error:', error);
    return res.status(500).json({ message: 'Failed to submit rating.' });
  }
});

app.get('/api/orders/ratings-summary', async (req, res) => {
  try {
    await connectDB();
    const orders = await Order.find({ 'items.userRating': { $ne: null } }).lean();

    const summary = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.userRating === null || item.userRating === undefined) return;
        const key = [item.category, item.section, item.rowTitle, item.name]
          .map((v) => String(v || '').trim().toLowerCase())
          .join('::');

        if (!summary[key]) summary[key] = { total: 0, count: 0 };
        summary[key].total += item.userRating;
        summary[key].count += 1;
      });
    });

    const finalSummary = {};
    Object.entries(summary).forEach(([key, { total, count }]) => {
      finalSummary[key] = { rating: total / count, reviews: count };
    });

    return res.json({ summary: finalSummary });
  } catch (error) {
    console.error('Ratings Summary Error:', error);
    return res.status(500).json({ message: 'Failed to load ratings summary.' });
  }
});

// --- SERVER EXECUTION ---
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;