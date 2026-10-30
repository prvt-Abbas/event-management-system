const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool to MySQL (Data Tier)
// IMPORTANT: DB_PORT must match the MySQL server you actually run.
// This project defaults to 3307 (the port used by the restaurant project
// on this machine). If your MySQL runs on 3306 (e.g. XAMPP), change
// DB_PORT in backend/.env to 3306. Backend, setup.js and check.js all
// read the SAME .env file, so set it once here and do not use the
// mysql CLI on a different port - that was the old restaurant bug
// where backend and CLI talked to two different servers.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_db',
  port: process.env.DB_PORT || 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// A failed idle connection must not crash the whole server.
pool.on('error', (err) => {
  console.error('MySQL pool error (server keeps running):', err.code || err.message);
});

module.exports = pool;
