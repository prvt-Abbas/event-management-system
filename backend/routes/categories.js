const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.sqlMessage || e.message || e.code || 'Database error' });
  }
});

module.exports = router;
