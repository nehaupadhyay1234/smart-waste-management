// server/routes/bins.js
const express  = require('express');
const router   = express.Router();
const store    = require('../data/store');
const { detectAnomalies } = require('../ai/predictor');

// GET /api/bins  — all bins with optional filters
router.get('/', (req, res) => {
  let data = store.bins();
  const { zone, status, type } = req.query;
  if (zone)   data = data.filter(b => b.zoneId === zone);
  if (status) data = data.filter(b => b.status.toLowerCase() === status.toLowerCase());
  if (type)   data = data.filter(b => b.type.toLowerCase()   === type.toLowerCase());
  res.json({ total: data.length, bins: data });
});

// GET /api/bins/anomalies
router.get('/anomalies', (req, res) => {
  const anomalies = detectAnomalies(store.bins());
  res.json({ total: anomalies.length, anomalies });
});

// GET /api/bins/:id
router.get('/:id', (req, res) => {
  const bin = store.bins().find(b => b.id === req.params.id);
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  res.json(bin);
});

// PATCH /api/bins/:id/empty  — simulate emptying a bin
router.patch('/:id/empty', (req, res) => {
  const bin = store.bins().find(b => b.id === req.params.id);
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  bin.fillLevel   = 0;
  bin.status      = 'Normal';
  bin.alerts      = [];
  bin.lastEmptied = new Date().toISOString();
  res.json({ success: true, bin });
});

module.exports = router;
