// server/ai/predictor.js
// Lightweight AI prediction engine using statistical modelling
// (Linear regression + seasonal decomposition + anomaly detection)

/**
 * Simple weighted linear regression on a time series.
 * Returns { slope, intercept, r2 }
 */
function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, ssy = 0;
  values.forEach((y, x) => {
    sxy += (x - xMean) * (y - yMean);
    sxx += (x - xMean) ** 2;
    ssy += (y - yMean) ** 2;
  });
  const slope     = sxx ? sxy / sxx : 0;
  const intercept = yMean - slope * xMean;
  const r2        = ssy  ? (sxy ** 2) / (sxx * ssy) : 0;
  return { slope, intercept, r2 };
}

/**
 * Day-of-week seasonal index (7 periods).
 * Input: array of { value, dow(0-6) }
 */
function seasonalIndex(entries) {
  const sums  = Array(7).fill(0);
  const cnts  = Array(7).fill(0);
  entries.forEach(({ value, dow }) => { sums[dow] += value; cnts[dow]++; });
  const avgs  = sums.map((s, i) => cnts[i] ? s / cnts[i] : 1);
  const grand = avgs.reduce((a, b) => a + b, 0) / 7;
  return avgs.map(a => grand ? a / grand : 1);
}

/**
 * Predict waste volume for the next `days` days for a given zone.
 * Uses last 30 days of history.
 */
function predictCollection(zoneHistory, days = 7) {
  if (!zoneHistory || zoneHistory.length === 0) return [];

  const values  = zoneHistory.map(h => h.waste);
  const { slope, intercept, r2 } = linearRegression(values);

  // Seasonal factors from history
  const entries = zoneHistory.map((h, i) => ({
    value: h.waste,
    dow:   new Date(h.date).getDay(),
  }));
  const seasonal = seasonalIndex(entries);

  // Standard deviation for confidence interval
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);

  const predictions = [];
  const lastDate    = new Date(zoneHistory[zoneHistory.length - 1].date);

  for (let d = 1; d <= days; d++) {
    const date   = new Date(lastDate);
    date.setDate(date.getDate() + d);
    const dow    = date.getDay();
    const trend  = intercept + slope * (values.length - 1 + d);
    const adj    = trend * seasonal[dow];
    const lower  = Math.max(0, adj - 1.64 * std); // 90% CI
    const upper  = adj + 1.64 * std;

    predictions.push({
      date:       date.toISOString().split('T')[0],
      predicted:  Math.round(adj   * 10) / 10,
      lower:      Math.round(lower * 10) / 10,
      upper:      Math.round(upper * 10) / 10,
      confidence: Math.round(Math.min(r2 * 100, 99)),
      dow,
      peakRisk:   seasonal[dow] > 1.2 ? 'High' : seasonal[dow] > 1.0 ? 'Medium' : 'Low',
    });
  }
  return predictions;
}

/**
 * Optimal collection schedule: pick the top-N days with highest predicted waste.
 */
function optimalSchedule(predictions, truckCount = 3) {
  return [...predictions]
    .sort((a, b) => b.predicted - a.predicted)
    .slice(0, truckCount)
    .map(p => ({ ...p, recommended: true }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Detect anomalous bins: fill-level spikes vs zone average.
 */
function detectAnomalies(bins) {
  const zoneMap = {};
  bins.forEach(b => {
    if (!zoneMap[b.zoneId]) zoneMap[b.zoneId] = [];
    zoneMap[b.zoneId].push(b.fillLevel);
  });

  return bins
    .filter(b => {
      const levels = zoneMap[b.zoneId];
      const mean   = levels.reduce((s, v) => s + v, 0) / levels.length;
      const std    = Math.sqrt(levels.reduce((s, v) => s + (v - mean) ** 2, 0) / levels.length);
      return std > 0 && (b.fillLevel - mean) / std > 1.5;
    })
    .map(b => ({ binId: b.id, zoneId: b.zoneId, fillLevel: b.fillLevel, status: b.status }));
}

/**
 * Route optimisation: greedy nearest-neighbour for a list of critical bins.
 * Returns ordered waypoints.
 */
function optimiseRoute(bins, startLat, startLng) {
  let remaining = [...bins];
  const route   = [];
  let curLat = startLat, curLng = startLng;

  while (remaining.length) {
    let best = null, bestDist = Infinity;
    remaining.forEach(b => {
      const d = Math.hypot(b.lat - curLat, b.lng - curLng);
      if (d < bestDist) { bestDist = d; best = b; }
    });
    route.push({ ...best, distFromPrev: Math.round(bestDist * 111000) }); // metres approx
    curLat = best.lat; curLng = best.lng;
    remaining = remaining.filter(b => b.id !== best.id);
  }
  return route;
}

/**
 * Overall system health & KPI summary.
 */
function systemKPIs(bins, history, vehicles) {
  const allBins      = bins.length;
  const critical     = bins.filter(b => b.status === 'Critical').length;
  const warning      = bins.filter(b => b.status === 'Warning').length;
  const sensorCov    = Math.round(bins.filter(b => b.sensor).length / allBins * 100);
  const avgFill      = Math.round(bins.reduce((s, b) => s + b.fillLevel, 0) / allBins);

  const todayStr     = new Date().toISOString().split('T')[0];
  const todayRecs    = history.filter(h => h.date === todayStr);
  const totalToday   = todayRecs.reduce((s, h) => s + h.waste, 0);
  const recycleToday = todayRecs.reduce((s, h) => s + h.recycled, 0);
  const recycleRate  = totalToday ? Math.round(recycleToday / totalToday * 100) : 35;

  const activeVeh    = vehicles.filter(v => v.status === 'Active').length;
  const fleetUtil    = Math.round(
    vehicles.filter(v => v.status !== 'Maintenance').reduce((s, v) => s + v.currentLoad / v.capacity, 0) /
    vehicles.filter(v => v.status !== 'Maintenance').length * 100
  );

  return { allBins, critical, warning, sensorCov, avgFill, totalToday: Math.round(totalToday), recycleRate, activeVeh, fleetUtil };
}

module.exports = { predictCollection, optimalSchedule, detectAnomalies, optimiseRoute, systemKPIs };
