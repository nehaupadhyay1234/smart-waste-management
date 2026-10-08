// server/routes/zones.js
const express = require('express');
const router  = express.Router();
const store   = require('../data/store');

// GET /api/zones
router.get('/', (req, res) => {
  const zones = store.zones.map(z => {
    const zoneBins = store.bins().filter(b => b.zoneId === z.id);
    const avgFill  = zoneBins.length
      ? Math.round(zoneBins.reduce((s, b) => s + b.fillLevel, 0) / zoneBins.length)
      : 0;
    const critical = zoneBins.filter(b => b.status === 'Critical').length;
    return { ...z, binCount: zoneBins.length, avgFill, critical };
  });
  res.json({ total: zones.length, zones });
});

// GET /api/zones/:id
router.get('/:id', (req, res) => {
  const zone = store.zones.find(z => z.id === req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  const zoneBins = store.bins().filter(b => b.zoneId === zone.id);
  res.json({ ...zone, bins: zoneBins });
});

module.exports = router;
