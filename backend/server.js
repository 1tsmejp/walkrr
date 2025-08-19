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
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------- File uploads ----------
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

// health
app.get('/health', (req,res)=>res.json({ ok:true }));

// auth
app.post('/api/auth/register', async (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const q = `insert into users (email, password_hash, display_name) values ($1,$2,$3) returning id, email, display_name, created_at`;
    const { rows } = await pool.query(q, [email, hash, display_name || null]);
    const user = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'supersecretjwt', { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query('select * from users where email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'supersecretjwt', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, display_name: user.display_name, created_at: user.created_at } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/me', auth, async (req, res) => {
  const { rows } = await pool.query('select id, email, display_name, created_at from users where id=$1', [req.user.id]);
  res.json(rows[0]);
});

// upload endpoint
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// pets
app.get('/api/pets', auth, async (req, res) => {
  const { rows } = await pool.query('select * from pets where owner_id=$1 order by created_at desc', [req.user.id]);
  res.json(rows);
});

app.post('/api/pets', auth, async (req, res) => {
  const { name, breed, photo_url } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'insert into pets (owner_id, name, breed, photo_url) values ($1,$2,$3,$4) returning *',
    [req.user.id, name, breed || null, photo_url || null]
  );
  res.json(rows[0]);
});

app.delete('/api/pets/:id', auth, async (req, res) => {
  await pool.query('delete from pets where id=$1 and owner_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// walks
app.post('/api/walks', auth, async (req, res) => {
  const { pet_ids, route, distance_m, duration_s, notes, privacy='public', events=[] } = req.body || {};
  if (!Array.isArray(pet_ids) || !pet_ids.length) return res.status(400).json({ error: 'pet_ids required' });
  if (!Array.isArray(route) || !route.length) return res.status(400).json({ error: 'route required' });
  try {
    const q = `insert into walks (user_id, pet_ids, route, distance_m, duration_s, notes, privacy) values ($1,$2,$3,$4,$5,$6,$7) returning *`;
    const { rows } = await pool.query(q, [req.user.id, pet_ids, JSON.stringify(route), distance_m|0, duration_s|0, notes||null, privacy]);
    const walk = rows[0];
    if (Array.isArray(events) && events.length) {
      const evQ = `insert into walk_events (walk_id, type, lat, lon, occurred_at) values ($1,$2,$3,$4,$5)`;
      for (const ev of events) {
        await pool.query(evQ, [walk.id, ev.type, ev.lat, ev.lon, ev.occurred_at || new Date()]);
      }
    }
    res.json(walk);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save walk' });
  }
});

app.get('/api/walks', auth, async (req, res) => {
  const { rows } = await pool.query('select * from walks where user_id=$1 order by created_at desc', [req.user.id]);
  res.json(rows);
});

app.get('/api/walks/:id/events', auth, async (req, res) => {
  const { rows } = await pool.query('select * from walk_events where walk_id=$1 order by occurred_at asc', [req.params.id]);
  res.json(rows);
});

// posts
app.post('/api/posts', auth, async (req, res) => {
  const { walk_id, caption, privacy='public' } = req.body || {};
  if (!walk_id) return res.status(400).json({ error: 'walk_id required' });
  const { rows } = await pool.query(
    'insert into posts (author_id, walk_id, caption, privacy) values ($1,$2,$3,$4) returning *',
    [req.user.id, walk_id, caption||null, privacy]
  );
  res.json(rows[0]);
});

app.get('/api/posts', auth, async (req, res) => {
  const { rows } = await pool.query(`
    select p.*, u.display_name, 
           (select count(*) from likes l where l.post_id=p.id) as like_count,
           (select json_agg(json_build_object('id', c.id, 'author_id', c.author_id, 'body', c.body, 'created_at', c.created_at))
              from comments c where c.post_id=p.id) as comments
    from posts p
    join users u on u.id=p.author_id
    where privacy='public'
    order by p.created_at desc
    limit 50
  `);
  res.json(rows);
});

app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    await pool.query('insert into likes (post_id, user_id) values ($1,$2) on conflict do nothing', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'like failed' });
  }
});

app.post('/api/posts/:id/comment', auth, async (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body required' });
  const { rows } = await pool.query(
    'insert into comments (post_id, author_id, body) values ($1,$2,$3) returning *',
    [req.params.id, req.user.id, body]
  );
  res.json(rows[0]);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));

// communities/social routes
require('./routes/social')(app, db, authRequired)
