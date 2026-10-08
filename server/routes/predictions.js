// server/routes/predictions.js
const express = require('express');
const router  = express.Router();
const store   = require('../data/store');
const { predictCollection, optimalSchedule, optimiseRoute } = require('../ai/predictor');

// GET /api/predictions?zone=Z001&days=7
router.get('/', (req, res) => {
  const days   = parseInt(req.query.days) || 7;
  const zoneId = req.query.zone;

  if (zoneId) {
    const zoneHistory = store.history().filter(h => h.zoneId === zoneId);
    if (!zoneHistory.length) return res.status(404).json({ error: 'No history for zone' });
    const predictions = predictCollection(zoneHistory, days);
    const schedule    = optimalSchedule(predictions, Math.ceil(days / 3));
    return res.json({ zoneId, days, predictions, recommendedSchedule: schedule });
  }

  // All zones
  const result = store.zones.map(z => {
    const zh   = store.history().filter(h => h.zoneId === z.id);
    const pred = predictCollection(zh, days);
    return { zoneId: z.id, zoneName: z.name, predictions: pred, recommended: optimalSchedule(pred, 3) };
  });
  res.json({ days, zones: result });
});

// GET /api/predictions/route?zone=Z001
// Returns optimised collection route for critical/warning bins in a zone
router.get('/route', (req, res) => {
  const { zone } = req.query;
  let candidateBins = store.bins().filter(b => b.status !== 'Normal');
  if (zone) candidateBins = candidateBins.filter(b => b.zoneId === zone);

  if (!candidateBins.length) return res.json({ message: 'No bins require collection', route: [] });

  // Depot start position (city centre)
  const route = optimiseRoute(candidateBins, 40.7128, -74.0060);
  const totalDist = route.reduce((s, w) => s + (w.distFromPrev || 0), 0);
  res.json({ totalBins: route.length, totalDistanceM: totalDist, route });
});

module.exports = router;
