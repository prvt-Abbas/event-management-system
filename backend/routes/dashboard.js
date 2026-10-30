const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/dashboard?userId=
// Overall stats + (if userId given) that user's registrations.
router.get('/', async (req, res) => {
  try {
    const [[events]] = await pool.query('SELECT COUNT(*) AS n FROM events');
    const [[upcoming]] = await pool.query("SELECT COUNT(*) AS n FROM events WHERE status = 'upcoming'");
    const [[regs]] = await pool.query("SELECT COUNT(*) AS n, COALESCE(SUM(tickets), 0) AS tickets, COALESCE(SUM(total_amount), 0) AS revenue FROM registrations WHERE status = 'confirmed'");
    const [upcomingEvents] = await pool.query(
      `SELECT e.*, c.name AS category, (SELECT COALESCE(SUM(tickets), 0) FROM registrations WHERE event_id = e.id AND status = 'confirmed') AS booked
       FROM events e LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.status = 'upcoming' ORDER BY e.event_date LIMIT 5`
    );
    let myRegs = [];
    if (req.query.userId) {
      [myRegs] = await pool.query(
        "SELECT COUNT(*) AS n FROM registrations WHERE user_id = ? AND status = 'confirmed'",
        [req.query.userId]
      );
    }
    res.json({
      total_events: events.n,
      upcoming_events: upcoming.n,
      total_registrations: regs.n,
      total_tickets: regs.tickets,
      total_revenue: regs.revenue,
      my_registrations: myRegs.length ? myRegs[0].n : 0,
      upcoming_list: upcomingEvents.map(e => ({ ...e, seats_left: e.capacity - e.booked }))
    });
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

module.exports = router;
