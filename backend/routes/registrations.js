const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// POST /api/registrations  Body: { user_id, event_id, tickets }
// Transaction-safe: the event row is locked (FOR UPDATE) while we check
// capacity, so two people registering at the same time cannot overbook it.
router.post('/', async (req, res) => {
  const { user_id, event_id, tickets } = req.body;
  const n = Math.max(1, parseInt(tickets, 10) || 1);
  if (!user_id || !event_id) return res.status(400).json({ error: 'User and event are required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[event]] = await conn.query('SELECT * FROM events WHERE id = ? FOR UPDATE', [event_id]);
    if (!event) { await conn.rollback(); return res.status(404).json({ error: 'Event not found' }); }
    if (event.status === 'cancelled') { await conn.rollback(); return res.status(400).json({ error: 'This event has been cancelled' }); }
    const [[dup]] = await conn.query(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ? AND status = ?',
      [user_id, event_id, 'confirmed']
    );
    if (dup) { await conn.rollback(); return res.status(409).json({ error: 'You are already registered for this event' }); }
    const [[row]] = await conn.query(
      'SELECT COALESCE(SUM(tickets), 0) AS booked FROM registrations WHERE event_id = ? AND status = ?',
      [event_id, 'confirmed']
    );
    if (row.booked + n > event.capacity) {
      await conn.rollback();
      return res.status(400).json({ error: `Only ${event.capacity - row.booked} seat(s) left for this event` });
    }
    const total = Number(event.price) * n;
    const [result] = await conn.query(
      'INSERT INTO registrations (user_id, event_id, tickets, total_amount) VALUES (?, ?, ?, ?)',
      [user_id, event_id, n, total]
    );
    await conn.commit();
    const [[created]] = await pool.query('SELECT * FROM registrations WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  } finally {
    conn.release();
  }
});

// GET /api/registrations/user/:userId - my registrations, with event details
router.get('/user/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, e.title, e.venue, e.event_date, e.price, c.name AS category
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE r.user_id = ? ORDER BY r.registered_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// GET /api/registrations/event/:eventId - attendee list for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.full_name, u.email FROM registrations r
       JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ? ORDER BY r.registered_at`,
      [req.params.eventId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

// PUT /api/registrations/:id/cancel - frees the seats again
router.put('/:id/cancel', async (req, res) => {
  try {
    await pool.query("UPDATE registrations SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

module.exports = router;
