const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
// Serve the frontend from the backend, so http://localhost:5000/ just works
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes = Application Tier API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/categories', require('./routes/categories'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Event API is running' }));

// Express 4 does not catch async route errors by itself.
// Return a JSON error instead of letting the server crash.
app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ error: err.sqlMessage || err.message || err.code || 'Server error' });
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (server keeps running):', err && (err.sqlMessage || err.message || err.code));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
