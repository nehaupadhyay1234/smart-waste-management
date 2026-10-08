// server/index.js  — Main Express server
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── API Routes ─────────────────────────────────
app.use('/api/bins',        require('./routes/bins'));
app.use('/api/zones',       require('./routes/zones'));
app.use('/api/vehicles',    require('./routes/vehicles'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/analytics',   require('./routes/analytics'));

// ── Health Check ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── Catch-all: serve frontend ──────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚛  Smart Waste Management System`);
  console.log(`📡  Server running at http://localhost:${PORT}`);
  console.log(`🤖  AI Prediction Engine: ACTIVE`);
  console.log(`📊  REST API: http://localhost:${PORT}/api/health\n`);
});
