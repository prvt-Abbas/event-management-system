// Diagnose a port / database mismatch before you start the server.
// Usage, from backend/:  npm run check
// This prints host, port and database ONLY - never the password.
const mysql = require('mysql2/promise');
require('dotenv').config();

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: process.env.DB_PORT || 3307,
  database: process.env.DB_NAME || 'event_db'
};
console.log(`Checking ${cfg.user}@${cfg.host}:${cfg.port} / ${cfg.database} ...`);

async function tryPort(port) {
  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: process.env.DB_PASSWORD || '', port
  });
  try {
    const [dbs] = await conn.query('SHOW DATABASES');
    const hasDb = dbs.some(r => Object.values(r)[0] === cfg.database);
    if (!hasDb) return { port, hasDb, counts: null };
    const [[users]] = await conn.query(`SELECT COUNT(*) AS n FROM ${cfg.database}.users`);
    const [[events]] = await conn.query(`SELECT COUNT(*) AS n FROM ${cfg.database}.events`);
    return { port, hasDb, counts: { users: users.n, events: events.n } };
  } finally { await conn.end(); }
}

(async () => {
  try {
    const r = await tryPort(cfg.port);
    console.log(`Port ${r.port}: event_db exists = ${r.hasDb}` + (r.counts ? `, users=${r.counts.users}, events=${r.counts.events}` : ''));
    if (!r.hasDb) {
      const alt = cfg.port == 3307 ? 3306 : 3307;
      try {
        const r2 = await tryPort(alt);
        console.log(`Port ${alt}: event_db exists = ${r2.hasDb}` + (r2.counts ? `, users=${r2.counts.users}, events=${r2.counts.events}` : ''));
        if (r2.hasDb) console.log(`FIX: Your database is on port ${alt}, not ${cfg.port}. Set DB_PORT=${alt} in backend/.env, then run npm run setup and npm start.`);
        else console.log('Database is on neither port. Run: npm run setup');
      } catch (e) { console.log(`Port ${alt}: cannot connect (${e.code || e.message})`); }
    } else if (r.counts && (r.counts.users !== 3 || r.counts.events !== 8)) {
      console.log('Counts are not 3 users / 8 events. Run: npm run setup (schema is idempotent).');
    } else {
      console.log('OK: database looks correct. Now run: npm start');
    }
  } catch (e) {
    console.error(`Cannot connect to port ${cfg.port}: ${e.code || e.message}`);
    const alt = cfg.port == 3307 ? 3306 : 3307;
    try {
      const r2 = await tryPort(alt);
      console.log(`But port ${alt} DOES connect, event_db exists = ${r2.hasDb}` + (r2.counts ? `, users=${r2.counts.users}, events=${r2.counts.events}` : ''));
      if (r2.hasDb) console.log(`FIX: Your database is on port ${alt}, not ${cfg.port}. Set DB_PORT=${alt} in backend/.env, then run npm run setup and npm start.`);
    } catch (e2) { console.log(`Port ${alt} also cannot connect (${e2.code || e2.message}). Check: MySQL is running, DB_USER/DB_PASSWORD in backend/.env are correct.`); }
    process.exit(1);
  }
})();
