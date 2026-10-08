// server/routes/vehicles.js
const express = require('express');
const router  = express.Router();
const store   = require('../data/store');

// GET /api/vehicles
router.get('/', (req, res) => {
  res.json({ total: store.vehicles.length, vehicles: store.vehicles });
});

// GET /api/vehicles/:id
router.get('/:id', (req, res) => {
  const v = store.vehicles.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(v);
});

// PATCH /api/vehicles/:id/status
router.patch('/:id/status', (req, res) => {
  const v = store.vehicles.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  v.status = status;
  res.json({ success: true, vehicle: v });
});

module.exports = router;
