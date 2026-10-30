// One-command database setup - no mysql.exe, no PowerShell redirection needed.
// Usage, from the backend folder:
//   1. Copy .env.example to .env and put your MySQL root password in DB_PASSWORD
//   2. npm run setup
// This creates event_db (if missing) and runs database/schema.sql.
// The schema is idempotent, so running setup again is safe.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Connect without a database first, so CREATE DATABASE works even if
  // event_db does not exist yet.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3307,
    multipleStatements: true
  });

  try {
    await conn.query(sql);
    const [[users]] = await conn.query('SELECT COUNT(*) AS n FROM event_db.users');
    const [[events]] = await conn.query('SELECT COUNT(*) AS n FROM event_db.events');
    const [[cats]] = await conn.query('SELECT COUNT(*) AS n FROM event_db.categories');
    console.log(`Database setup complete: event_db is ready. Users: ${users.n}, Categories: ${cats.n}, Events: ${events.n}`);
    if (users.n !== 3 || events.n !== 8) console.log('Warning: expected 3 users and 8 events. Check the counts above.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Setup failed:', err.code || err.sqlMessage || err.message || 'Unknown error');
  console.error('Check backend/.env: DB_HOST, DB_USER, DB_PASSWORD, DB_PORT and that MySQL is running.');
  process.exit(1);
});
