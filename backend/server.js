import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auth } from './auth.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

dotenv.config();
const app = express();

// CORS Configuration
app.use(cors({
  origin: 'https://walkrr.patti.tech',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// File uploads
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(UPLOAD_DIR));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// FIXED /api/me endpoint - ONLY select columns that exist
app.get('/api/me', auth, async (req, res) => {
  try {
    console.log('Getting user info for user ID:', req.user.id);
    
    // IMPORTANT: Only select columns that definitely exist in the users table
    const { rows } = await pool.query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1', 
      [req.user.id]
    );
    
    if (!rows[0]) {
      console.log('User not found in database:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User info retrieved successfully:', rows[0].email);
    res.json(rows[0]);
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Failed to get user info', details: error.message });
  }
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password, display_name } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, created_at',
      [email, hash, display_name || null]
    );
    const user = rows[0];
    
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET || 'supersecretjwt', 
      { expiresIn: '7d' }
    );
    
    res.json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET || 'supersecretjwt', 
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        display_name: user.display_name, 
        created_at: user.created_at 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Basic endpoints
app.get('/api/pets', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC', 
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Pets list error:', error);
    res.status(500).json({ error: 'Failed to get pets' });
  }
});

app.post('/api/pets', auth, async (req, res) => {
  const { name, breed, photo_url } = req.body || {};
  
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }
  
  try {
    const { rows } = await pool.query(
      'INSERT INTO pets (owner_id, name, breed, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, breed || null, photo_url || null]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Pet creation error:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
});

app.get('/api/walks', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM walks WHERE user_id = $1 ORDER BY created_at DESC', 
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Walks list error:', error);
    res.status(500).json({ error: 'Failed to get walks' });
  }
});

app.post('/api/walks', auth, async (req, res) => {
  const { pet_ids, route, distance_m, duration_s, notes, privacy = 'public', events = [] } = req.body || {};
  
  if (!Array.isArray(pet_ids) || !pet_ids.length) {
    return res.status(400).json({ error: 'pet_ids required' });
  }
  
  if (!Array.isArray(route) || !route.length) {
    return res.status(400).json({ error: 'route required' });
  }
  
  try {
    const { rows } = await pool.query(
      'INSERT INTO walks (user_id, pet_ids, route, distance_m, duration_s, notes, privacy) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, pet_ids, JSON.stringify(route), distance_m || 0, duration_s || 0, notes || null, privacy]
    );
    
    const walk = rows[0];
    
    if (Array.isArray(events) && events.length) {
      for (const event of events) {
        await pool.query(
          'INSERT INTO walk_events (walk_id, type, lat, lon, occurred_at) VALUES ($1, $2, $3, $4, $5)',
          [walk.id, event.type, event.lat, event.lon, event.occurred_at || new Date()]
        );
      }
    }
    
    res.json(walk);
  } catch (error) {
    console.error('Walk creation error:', error);
    res.status(500).json({ error: 'Failed to save walk' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Backend server listening on port 4000');
  console.log('📍 Health check: http://localhost:4000/api/health');
  console.log('🗃️  Database: db:5432');
  console.log('🌐 CORS enabled for: https://walkrr.patti.tech');
  console.log('✅ /api/me endpoint FIXED - no photo_url column');
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// File upload endpoint (add this before the "Start server" section)
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  console.log('File uploaded:', req.file.filename);
  res.json({ url: `/uploads/${req.file.filename}` });
});
