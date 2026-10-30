const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const router = express.Router();

function publicUser(u) {
  return { id: u.id, full_name: u.full_name, email: u.email, role: u.role, phone: u.phone || '' };
}

// POST /api/auth/register
// Body: { full_name, email, password, role?, phone? }
// role may only be 'attendee' or 'organizer' here, so nobody can
// self-register as admin. The admin account is seeded in schema.sql only.
router.post('/register', async (req, res) => {
  const { full_name, email, password, role, phone } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  const safeRole = role === 'organizer' ? 'organizer' : 'attendee';
  try {
    const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'This email is already registered. Please log in instead.' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hash, safeRole, phone || null]
    );
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(publicUser(user));
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// POST /api/auth/login  Body: { email, password }
// Demo logins (seeded in schema.sql):
//   admin@events.com / admin123  |  organizer@events.com / organizer123  |  user@events.com / user123
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    res.json(publicUser(user));
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

module.exports = router;
