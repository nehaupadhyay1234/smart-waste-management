// public/js/charts.js — Chart rendering helpers using Chart.js

const Charts = (() => {

  const COLORS = {
    accent:  '#58a6ff',
    green:   '#3fb950',
    yellow:  '#d29922',
    red:     '#f85149',
    purple:  '#bc8cff',
    orange:  '#e3b341',
    muted:   '#8b949e',
    bg3:     '#21262d',
    border:  '#30363d',
  };

  Chart.defaults.color          = '#8b949e';
  Chart.defaults.borderColor    = '#30363d';
  Chart.defaults.font.family    = "'Inter', sans-serif";
  Chart.defaults.font.size      = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  const instances = {};

  function destroy(id) {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  }

  // ── Waste Trend Line Chart ──────────────────────────
  function wasteTrend(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date.slice(5)),
        datasets: [
          {
            label: 'Total Waste (kg)',
            data:  data.map(d => d.waste),
            borderColor: COLORS.accent, backgroundColor: 'rgba(88,166,255,.1)',
            fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2,
          },
          {
            label: 'Recycled (kg)',
            data:  data.map(d => d.recycled),
            borderColor: COLORS.green, backgroundColor: 'rgba(63,185,80,.1)',
            fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { color: COLORS.border }, ticks: { maxTicksLimit: 10 } },
          y: { grid: { color: COLORS.border }, beginAtZero: true },
        },
      },
    });
  }

  // ── Prediction Bar Chart ────────────────────────────
  function predictionBars(canvasId, predictions) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const colors = predictions.map(p => p.peakRisk === 'High' ? COLORS.red : p.peakRisk === 'Medium' ? COLORS.yellow : COLORS.green);
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: predictions.map(p => p.date.slice(5)),
        datasets: [
          {
            label: 'Predicted Waste (kg)',
            data:  predictions.map(p => p.predicted),
            backgroundColor: colors,
            borderRadius: 4,
          },
          {
            label: 'Upper CI',
            data:  predictions.map(p => p.upper),
            type: 'line', borderColor: COLORS.muted, backgroundColor: 'transparent',
            borderDash: [4,4], pointRadius: 0, borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { color: COLORS.border } },
          y: { grid: { color: COLORS.border }, beginAtZero: true },
        },
      },
    });
  }

  // ── Zone Donut (fill levels) ─────────────────────────
  function zoneDonut(canvasId, zones) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: zones.map(z => z.name),
        datasets: [{
          data: zones.map(z => z.avgFill),
          backgroundColor: [COLORS.accent, COLORS.green, COLORS.yellow, COLORS.red, COLORS.purple, COLORS.orange],
          borderWidth: 2, borderColor: '#161b22',
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { padding: 16 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}% avg fill` } },
        },
        cutout: '65%',
      },
    });
  }

  // ── Fleet load bar ────────────────────────────────────
  function fleetBars(canvasId, vehicles) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const pct = vehicles.map(v => Math.round(v.currentLoad / v.capacity * 100));
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: vehicles.map(v => v.name),
        datasets: [{
          label: 'Load %',
          data: pct,
          backgroundColor: pct.map(p => p > 90 ? COLORS.red : p > 60 ? COLORS.yellow : COLORS.green),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: COLORS.border }, max: 100, ticks: { callback: v => v + '%' } },
          y: { grid: { color: COLORS.border } },
        },
      },
    });
  }

  // ── Complaint type pie ────────────────────────────────
  function complaintPie(canvasId, byType) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const labels = Object.keys(byType);
    const values = Object.values(byType);
    instances[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [COLORS.red, COLORS.yellow, COLORS.accent, COLORS.purple, COLORS.orange],
          borderWidth: 2, borderColor: '#161b22',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { padding: 12 } } },
      },
    });
  }

  return { wasteTrend, predictionBars, zoneDonut, fleetBars, complaintPie };
})();
