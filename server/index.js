import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import guestRoutes from './routes/guest.js';
import billsRoutes from './routes/bills.js';

dotenv.config();

const app = express();

// Middlewares - allow localhost on any port for dev
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, allowedOrigins[0]);
  },
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/bills', billsRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Bill Split API Running 🚀');
});

// Connect to MongoDB first, then start server
const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('\nCheck:');
    console.error('1. MONGO_URI in server/.env is correct');
    console.error('2. Password in connection string has no typos');
    console.error('3. MongoDB Atlas: Network Access has your IP (or 0.0.0.0/0 for dev)');
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();