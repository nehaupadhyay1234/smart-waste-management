// public/js/app.js — Main application controller

document.addEventListener('DOMContentLoaded', () => {

  // ── Toast ────────────────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(msg, type = 'info', dur = 3000) {
    toast.textContent = msg;
    toast.className   = `show ${type}`;
    setTimeout(() => { toast.className = ''; }, dur);
  }

  // ── Sidebar / navigation ──────────────────────────────
  const sidebar   = document.querySelector('.sidebar');
  const overlay   = document.querySelector('.sidebar-overlay');
  const menuBtn   = document.querySelector('.menu-toggle');
  const navItems  = document.querySelectorAll('.nav-item[data-page]');
  const pages     = document.querySelectorAll('.page');
  const pageTitle = document.querySelector('.topbar-title');

  function openSidebar()  { sidebar.classList.add('open');  overlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

  menuBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  function navigateTo(pageId) {
    pages.forEach(p => p.classList.toggle('active', p.id === pageId));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.page === pageId));
    const active = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    pageTitle.textContent = active ? active.querySelector('.nav-label').textContent : '';
    closeSidebar();
    loadPage(pageId);
  }

  navItems.forEach(n => n.addEventListener('click', () => navigateTo(n.dataset.page)));

  // ── Time display ──────────────────────────────────────
  const clock = document.getElementById('live-clock');
  function updateClock() {
    clock.textContent = new Date().toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ── Helpers ───────────────────────────────────────────
  function fillBar(pct, extraClass = '') {
    const cl = pct >= 90 ? 'red' : pct >= 75 ? 'yellow' : 'green';
    return `<div class="progress-wrap"><div class="progress-fill ${cl} ${extraClass}" style="width:${pct}%"></div></div>`;
  }
  function badge(text) {
    return `<span class="badge ${(text||'').toLowerCase().replace(/\s+/g,'-')}">${text}</span>`;
  }
  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : n; }

  // ────────────────────────────────────────────────────
  // DASHBOARD PAGE
  // ────────────────────────────────────────────────────
  async function loadDashboard() {
    try {
      const [kpis, hist, zones, vehicles] = await Promise.all([
        API.kpis(), API.history('', 14), API.zones(), API.vehicles(),
      ]);

      // KPI Cards
      document.getElementById('kpi-bins').textContent      = fmt(kpis.allBins);
      document.getElementById('kpi-critical').textContent  = kpis.critical;
      document.getElementById('kpi-warning').textContent   = kpis.warning;
      document.getElementById('kpi-fill').textContent      = kpis.avgFill + '%';
      document.getElementById('kpi-recycle').textContent   = kpis.recycleRate + '%';
      document.getElementById('kpi-vehicles').textContent  = kpis.activeVeh;
      document.getElementById('kpi-fleet').textContent     = kpis.fleetUtil + '%';
      document.getElementById('kpi-sensor').textContent    = kpis.sensorCov + '%';

      // Waste trend chart
      Charts.wasteTrend('chart-waste-trend', hist.series);

      // Zone fill donut
      Charts.zoneDonut('chart-zone-donut', zones.zones);

      // Alert feed
      const feed = document.getElementById('alert-feed');
      const allBins = await API.bins();
      const critical = allBins.bins.filter(b => b.status === 'Critical').slice(0, 5);
      const warning  = allBins.bins.filter(b => b.status === 'Warning').slice(0, 5);
      const alerts   = [
        ...critical.map(b => ({ type: 'red',    msg: `🔴 BIN ${b.id} in ${b.zoneName} is CRITICAL (${b.fillLevel}%)`, time: b.lastEmptied })),
        ...warning.map (b => ({ type: 'yellow', msg: `⚠️  BIN ${b.id} in ${b.zoneName} needs attention (${b.fillLevel}%)`, time: b.lastEmptied })),
      ].slice(0, 8);

      feed.innerHTML = alerts.length
        ? alerts.map(a => `
          <div class="alert-item">
            <div class="alert-dot ${a.type}"></div>
            <div>
              <div class="alert-msg">${a.msg}</div>
              <div class="alert-time">${timeAgo(a.time)}</div>
            </div>
          </div>`).join('')
        : '<div class="loading">✅ All bins normal</div>';

      // Map points
      renderMapPoints(allBins.bins);

    } catch (e) { showToast('Failed to load dashboard: ' + e.message, 'error'); }
  }

  function renderMapPoints(bins) {
    const map = document.getElementById('bins-map');
    if (!map) return;
    map.querySelectorAll('.map-point').forEach(p => p.remove());
    // Normalise lat/lng to map %, with some padding
    const lats = bins.map(b => b.lat), lngs = bins.map(b => b.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 0.08;
    bins.forEach(b => {
      const x = ((b.lng - minLng) / (maxLng - minLng || 1)) * (1 - pad*2) + pad;
      const y = 1 - ((b.lat - minLat) / (maxLat - minLat || 1)) * (1 - pad*2) - pad;
      const pt = document.createElement('div');
      pt.className = `map-point ${b.status.toLowerCase()}`;
      pt.style.left = (x * 100) + '%';
      pt.style.top  = (y * 100) + '%';
      pt.title      = `${b.id} — ${b.zoneName} (${b.fillLevel}%)`;
      pt.innerHTML  = `<div class="map-tooltip">${b.id} · ${b.fillLevel}% · ${b.status}</div>`;
      map.appendChild(pt);
    });
  }

  // ────────────────────────────────────────────────────
  // BINS PAGE
  // ────────────────────────────────────────────────────
  async function loadBins() {
    const grid    = document.getElementById('bins-grid');
    const zSel    = document.getElementById('filter-zone');
    const stSel   = document.getElementById('filter-status');
    const tySel   = document.getElementById('filter-type');

    grid.innerHTML = '<div class="loading"><div class="spinner"></div> Loading bins…</div>';

    try {
      const [binsData, zonesData] = await Promise.all([API.bins(), API.zones()]);

      // Populate zone filter
      if (zSel.options.length <= 1) {
        zonesData.zones.forEach(z => {
          const o = document.createElement('option');
          o.value = z.id; o.textContent = z.name;
          zSel.appendChild(o);
        });
      }

      function renderBins() {
        let bins = binsData.bins;
        if (zSel.value)  bins = bins.filter(b => b.zoneId   === zSel.value);
        if (stSel.value) bins = bins.filter(b => b.status.toLowerCase() === stSel.value);
        if (tySel.value) bins = bins.filter(b => b.type.toLowerCase()   === tySel.value);

        if (!bins.length) { grid.innerHTML = '<div class="loading">No bins match the filter.</div>'; return; }

        grid.innerHTML = bins.map(b => {
          const cl = b.status === 'Critical' ? 'red' : b.status === 'Warning' ? 'yellow' : 'green';
          return `
          <div class="bin-card ${b.status.toLowerCase()}" id="bc-${b.id}">
            <div class="bin-card-header">
              <div>
                <div class="bin-id">${b.id}</div>
                <div class="bin-type">${b.type}</div>
              </div>
              <div class="bin-fill-label text-${cl}">${b.fillLevel}%</div>
            </div>
            ${fillBar(b.fillLevel)}
            <div class="bin-zone">${b.zoneName}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
              ${badge(b.status)}
              <span class="text-muted" style="font-size:11px">🔋 ${b.battery}%</span>
            </div>
            <div class="text-muted" style="font-size:11px;margin-top:4px">
              Emptied ${timeAgo(b.lastEmptied)} · ${b.sensor ? '📡 IoT' : '🔲 Manual'}
            </div>
            <div class="bin-actions">
              ${b.status !== 'Normal' ? `<button class="btn sm primary" onclick="App.emptyBin('${b.id}')">Empty Now</button>` : ''}
            </div>
          </div>`;
        }).join('');
      }

      renderBins();
      zSel.onchange  = renderBins;
      stSel.onchange = renderBins;
      tySel.onchange = renderBins;

    } catch (e) {
      grid.innerHTML = '<div class="loading">Error loading bins.</div>';
      showToast(e.message, 'error');
    }
  }

  // ────────────────────────────────────────────────────
  // PREDICTIONS PAGE
  // ────────────────────────────────────────────────────
  async function loadPredictions() {
    const zoneSel = document.getElementById('pred-zone-sel');
    const daysSel = document.getElementById('pred-days-sel');
    const tbl     = document.getElementById('pred-table-body');
    const routeEl = document.getElementById('route-output');

    // Populate zone selector once
    if (zoneSel.options.length <= 1) {
      const z = await API.zones();
      z.zones.forEach(z => {
        const o = document.createElement('option');
        o.value = z.id; o.textContent = z.name;
        zoneSel.appendChild(o);
      });
    }

    async function runPrediction() {
      tbl.innerHTML = '<tr><td colspan="7"><div class="loading"><div class="spinner"></div> Running AI model…</div></td></tr>';
      try {
        const zoneId = zoneSel.value;
        const days   = parseInt(daysSel.value) || 7;
        const data   = await API.predictions(zoneId, days);

        let predictions = [];
        if (zoneId) {
          predictions = data.predictions || [];
        } else {
          // Aggregate first zone only for display
          const first = data.zones?.[0];
          predictions = first?.predictions || [];
        }

        Charts.predictionBars('chart-predictions', predictions);

        const schedule = data.recommendedSchedule || data.zones?.[0]?.recommended || [];
        const schedDates = new Set((schedule || []).map(s => s.date));

        tbl.innerHTML = predictions.map(p => `
          <tr ${schedDates.has(p.date) ? 'style="background:rgba(88,166,255,.05)"' : ''}>
            <td><strong>${p.date}</strong>${schedDates.has(p.date) ? ' <span style="color:var(--accent);font-size:10px">★ REC</span>' : ''}</td>
            <td>${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][p.dow]}</td>
            <td class="font-bold">${fmt(p.predicted)} kg</td>
            <td class="text-muted">${fmt(p.lower)} – ${fmt(p.upper)}</td>
            <td>${p.confidence}%</td>
            <td>${badge(p.peakRisk)}</td>
            <td>${schedDates.has(p.date) ? badge('Scheduled') : '—'}</td>
          </tr>`).join('');

        // Schedule summary
        const schedEl = document.getElementById('schedule-list');
        schedEl.innerHTML = schedule.length
          ? schedule.map(s => `
            <div class="pred-row">
              <div class="pred-bar-label"><span><strong>${s.date}</strong> &nbsp; ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.dow]}</span><span>${fmt(s.predicted)} kg · ${badge(s.peakRisk)}</span></div>
            </div>`).join('')
          : '<div class="text-muted" style="font-size:13px">No schedule generated.</div>';

      } catch (e) { tbl.innerHTML = `<tr><td colspan="7" class="text-red">${e.message}</td></tr>`; }
    }

    zoneSel.onchange = runPrediction;
    daysSel.onchange = runPrediction;
    document.getElementById('run-prediction-btn').onclick = runPrediction;
    runPrediction();

    // Optimal route
    document.getElementById('get-route-btn').onclick = async () => {
      routeEl.innerHTML = '<div class="loading"><div class="spinner"></div> Optimising route…</div>';
      try {
        const r = await API.route(zoneSel.value);
        if (!r.route.length) {
          routeEl.innerHTML = '<div class="text-green">✅ All bins are normal — no collection needed.</div>';
          return;
        }
        routeEl.innerHTML = `
          <div style="margin-bottom:10px">
            <strong>${r.totalBins}</strong> bins · 
            <strong>${Math.round(r.totalDistanceM / 1000 * 10) / 10} km</strong> total route
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Bin ID</th><th>Zone</th><th>Fill</th><th>Status</th><th>Dist</th></tr></thead>
              <tbody>${r.route.map((w, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td class="font-bold text-accent">${w.id}</td>
                  <td>${w.zoneName}</td>
                  <td>${fillBar(w.fillLevel)}&nbsp;${w.fillLevel}%</td>
                  <td>${badge(w.status)}</td>
                  <td class="text-muted">${i === 0 ? 'Start' : w.distFromPrev + 'm'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      } catch (e) { routeEl.innerHTML = `<div class="text-red">${e.message}</div>`; }
    };
  }

  // ────────────────────────────────────────────────────
  // FLEET PAGE
  // ────────────────────────────────────────────────────
  async function loadFleet() {
    try {
      const { vehicles } = await API.vehicles();
      const grid = document.getElementById('vehicles-grid');

      grid.innerHTML = vehicles.map(v => {
        const loadPct = Math.round(v.currentLoad / v.capacity * 100);
        const cl      = loadPct > 90 ? 'red' : loadPct > 60 ? 'yellow' : 'green';
        return `
        <div class="vehicle-card">
          <div class="v-header">
            <div>
              <div class="v-name">🚛 ${v.name}</div>
              <div class="v-driver text-muted">${v.driver}</div>
            </div>
            ${badge(v.status)}
          </div>
          <div class="mt-8">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span class="text-muted">Load</span>
              <span class="text-${cl} font-bold">${loadPct}%</span>
            </div>
            ${fillBar(loadPct)}
          </div>
          <div class="v-stats mt-8">
            <div>
              <div class="v-stat-label">Capacity</div>
              <div class="v-stat-val">${fmt(v.capacity)}L</div>
            </div>
            <div>
              <div class="v-stat-label">Current Load</div>
              <div class="v-stat-val">${fmt(v.currentLoad)}L</div>
            </div>
            <div>
              <div class="v-stat-label">Fuel</div>
              <div class="v-stat-val">${v.fuel}%</div>
            </div>
            <div>
              <div class="v-stat-label">Zone</div>
              <div class="v-stat-val">${v.zone || 'Base'}</div>
            </div>
          </div>
        </div>`;
      }).join('');

      Charts.fleetBars('chart-fleet', vehicles);

    } catch (e) { showToast(e.message, 'error'); }
  }

  // ────────────────────────────────────────────────────
  // ANALYTICS PAGE
  // ────────────────────────────────────────────────────
  async function loadAnalytics() {
    try {
      const [hist, complaints] = await Promise.all([API.history('', 30), API.complaints()]);

      Charts.wasteTrend('chart-analytics-trend', hist.series);
      Charts.complaintPie('chart-complaints', complaints.byType);

      // Complaints table
      const tbl = document.getElementById('complaints-body');
      tbl.innerHTML = complaints.recent.map(c => `
        <tr>
          <td class="text-muted" style="font-size:11px">${c.date.slice(0,10)}</td>
          <td>${c.zoneName}</td>
          <td>${c.type}</td>
          <td>${badge(c.priority)}</td>
          <td>${badge(c.status)}</td>
        </tr>`).join('');

    } catch (e) { showToast(e.message, 'error'); }
  }

  // ────────────────────────────────────────────────────
  // ZONES PAGE
  // ────────────────────────────────────────────────────
  async function loadZones() {
    try {
      const { zones } = await API.zones();
      const tbl = document.getElementById('zones-table-body');
      tbl.innerHTML = zones.map(z => `
        <tr>
          <td class="font-bold text-accent">${z.id}</td>
          <td><strong>${z.name}</strong></td>
          <td>${z.type}</td>
          <td>${fmt(z.population)}</td>
          <td>${z.binCount}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              ${fillBar(z.avgFill)}
              <span class="font-bold">${z.avgFill}%</span>
            </div>
          </td>
          <td>${z.critical > 0 ? `<span class="text-red font-bold">${z.critical}</span>` : '<span class="text-green">0</span>'}</td>
          <td>${badge(z.critical > 0 ? 'Critical' : z.avgFill > 75 ? 'Warning' : 'Normal')}</td>
        </tr>`).join('');
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ────────────────────────────────────────────────────
  // AI INSIGHTS PAGE
  // ────────────────────────────────────────────────────
  async function loadInsights() {
    try {
      const [kpis, anomalies, hist] = await Promise.all([API.kpis(), API.anomalies(), API.history('', 7)]);

      const el = document.getElementById('insights-content');
      const recycleScore = kpis.recycleRate >= 40 ? 'Excellent' : kpis.recycleRate >= 30 ? 'Good' : 'Needs Improvement';
      const fillHealth   = kpis.avgFill     <= 50 ? 'Healthy'  : kpis.avgFill <= 70 ? 'Moderate' : 'Overloaded';

      const weekWaste = hist.series.reduce((s, d) => s + d.waste, 0);

      el.innerHTML = `
        <div class="grid-3" style="margin-bottom:20px">
          <div class="kpi-card green">
            <div class="kpi-label">AI Health Score</div>
            <div class="kpi-value">${100 - Math.round(kpis.avgFill * 0.4 + kpis.critical * 5)}</div>
            <div class="kpi-sub">System performance index</div>
          </div>
          <div class="kpi-card accent">
            <div class="kpi-label">7-Day Waste Volume</div>
            <div class="kpi-value">${Math.round(weekWaste)}</div>
            <div class="kpi-sub">kg collected this week</div>
          </div>
          <div class="kpi-card ${kpis.critical > 3 ? 'red' : 'yellow'}">
            <div class="kpi-label">Anomalies Detected</div>
            <div class="kpi-value">${anomalies.total}</div>
            <div class="kpi-sub">Bins with abnormal fill spikes</div>
          </div>
        </div>
        <div class="grid-2">
          <div class="card mb-0">
            <div class="card-header"><h3>🤖 AI Recommendations</h3></div>
            <ul style="padding-left:18px;font-size:14px;line-height:2">
              <li>Recycle rate is <strong>${kpis.recycleRate}%</strong> — ${recycleScore}. ${kpis.recycleRate < 35 ? 'Consider adding more recycling bins in commercial zones.' : 'Keep up the green effort!'}</li>
              <li>Average fill level is <strong>${kpis.avgFill}%</strong> — ${fillHealth}. ${kpis.avgFill > 65 ? 'Increase collection frequency in high-density zones.' : 'Current schedule is efficient.'}</li>
              <li><strong>${kpis.critical}</strong> critical bin${kpis.critical !== 1 ? 's' : ''} need immediate pickup.</li>
              <li>Fleet utilisation at <strong>${kpis.fleetUtil}%</strong>. ${kpis.fleetUtil > 85 ? '⚠️ Deploy additional vehicles.' : 'Fleet is operating within optimal range.'}</li>
              <li>Sensor coverage: <strong>${kpis.sensorCov}%</strong>. ${kpis.sensorCov < 90 ? 'Install IoT sensors on remaining bins for full automation.' : 'Full sensor coverage achieved!'}</li>
            </ul>
          </div>
          <div class="card mb-0">
            <div class="card-header"><h3>🔍 Anomaly Detection</h3></div>
            ${anomalies.total === 0 ? '<div class="text-green" style="font-size:14px">✅ No anomalies detected. All bins within normal distribution.</div>' :
              `<div class="table-wrap">
                <table>
                  <thead><tr><th>Bin ID</th><th>Zone</th><th>Fill</th><th>Status</th></tr></thead>
                  <tbody>${anomalies.anomalies.map(a => `
                    <tr>
                      <td class="font-bold text-accent">${a.binId}</td>
                      <td>${a.zoneId}</td>
                      <td>${a.fillLevel}%</td>
                      <td>${badge(a.status)}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>`}
          </div>
        </div>`;
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ────────────────────────────────────────────────────
  // Page router
  // ────────────────────────────────────────────────────
  const loaders = {
    'page-dashboard':   loadDashboard,
    'page-bins':        loadBins,
    'page-predictions': loadPredictions,
    'page-fleet':       loadFleet,
    'page-analytics':   loadAnalytics,
    'page-zones':       loadZones,
    'page-insights':    loadInsights,
  };

  async function loadPage(id) {
    const fn = loaders[id];
    if (fn) await fn();
  }

  // ── Public API ────────────────────────────────────────
  window.App = {
    async emptyBin(id) {
      try {
        await API.emptyBin(id);
        showToast(`✅ Bin ${id} marked as emptied`, 'success');
        loadBins();
      } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    },
    navigate: navigateTo,
  };

  // ── Boot ──────────────────────────────────────────────
  navigateTo('page-dashboard');

  // Auto-refresh dashboard every 90 seconds
  setInterval(() => {
    const active = document.querySelector('.page.active');
    if (active?.id === 'page-dashboard') loadDashboard();
  }, 90000);

  // Update badge counts
  async function updateBadges() {
    try {
      const kpis = await API.kpis();
      const badge = document.querySelector('.nav-item[data-page="page-bins"] .nav-badge');
      if (badge) badge.textContent = kpis.critical || '';
      if (badge) badge.style.display = kpis.critical > 0 ? '' : 'none';
    } catch { /* ignore */ }
  }
  updateBadges();
  setInterval(updateBadges, 60000);
});
