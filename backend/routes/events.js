const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Seats booked, per event (confirmed registrations only)
const SEATS_SQL = `(SELECT COALESCE(SUM(tickets), 0) FROM registrations
                    WHERE event_id = e.id AND status = 'confirmed') AS booked`;

// GET /api/events?category=&search=&status=upcoming
router.get('/', async (req, res) => {
  const { category, search, status } = req.query;
  let sql = `SELECT e.*, c.name AS category, u.full_name AS organizer_name, ${SEATS_SQL}
             FROM events e
             LEFT JOIN categories c ON c.id = e.category_id
             LEFT JOIN users u ON u.id = e.organizer_id WHERE 1=1`;
  const params = [];
  if (category && category !== 'All') { sql += ' AND c.name = ?'; params.push(category); }
  if (search) { sql += ' AND (e.title LIKE ? OR e.venue LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { sql += ' AND e.status = ?'; params.push(status); }
  sql += ' ORDER BY e.event_date';
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ ...r, seats_left: r.capacity - r.booked })));
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT e.*, c.name AS category, u.full_name AS organizer_name, ${SEATS_SQL}
       FROM events e
       LEFT JOIN categories c ON c.id = e.category_id
       LEFT JOIN users u ON u.id = e.organizer_id WHERE e.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Event not found' });
    res.json({ ...row, seats_left: row.capacity - row.booked });
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// POST /api/events  Body: { title, description, category_id, organizer_id, venue, event_date, capacity, price }
// Only organizers and admins may create events.
router.post('/', async (req, res) => {
  const { title, description, category_id, organizer_id, venue, event_date, capacity, price } = req.body;
  if (!title || !venue || !event_date || !organizer_id) {
    return res.status(400).json({ error: 'Title, venue, date and organizer are required' });
  }
  try {
    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [organizer_id]);
    if (!user) return res.status(400).json({ error: 'Organizer not found - please log in again' });
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only organizers and admins can create events' });
    }
    const [result] = await pool.query(
      'INSERT INTO events (title, description, category_id, organizer_id, venue, event_date, capacity, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description || '', category_id || null, organizer_id, venue, event_date, capacity || 100, price || 0]
    );
    const [[created]] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// PUT /api/events/:id/status  Body: { status }
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await pool.query('UPDATE events SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

module.exports = router;
