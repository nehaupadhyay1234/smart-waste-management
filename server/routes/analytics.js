// server/routes/analytics.js
const express = require('express');
const router  = express.Router();
const store   = require('../data/store');
const { systemKPIs } = require('../ai/predictor');

// GET /api/analytics/kpis
router.get('/kpis', (req, res) => {
  const kpis = systemKPIs(store.bins(), store.history(), store.vehicles);
  res.json(kpis);
});

// GET /api/analytics/history?zone=Z001&days=30
router.get('/history', (req, res) => {
  const days   = parseInt(req.query.days) || 30;
  const zoneId = req.query.zone;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  let data = store.history().filter(h => h.date >= cutoff);
  if (zoneId) data = data.filter(h => h.zoneId === zoneId);

  // Aggregate by date
  const byDate = {};
  data.forEach(h => {
    if (!byDate[h.date]) byDate[h.date] = { date: h.date, waste: 0, recycled: 0, pickups: 0 };
    byDate[h.date].waste    += h.waste;
    byDate[h.date].recycled += h.recycled;
    byDate[h.date].pickups  += h.pickups;
  });

  const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    ...d,
    waste:    Math.round(d.waste    * 10) / 10,
    recycled: Math.round(d.recycled * 10) / 10,
  }));

  res.json({ days, zone: zoneId || 'All', series });
});

// GET /api/analytics/complaints
router.get('/complaints', (req, res) => {
  const data = store.complaints();
  const byType   = {};
  const byStatus = {};
  data.forEach(c => {
    byType[c.type]     = (byType[c.type]     || 0) + 1;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });
  res.json({ total: data.length, byType, byStatus, recent: data.slice(0, 10) });
});

module.exports = router;
