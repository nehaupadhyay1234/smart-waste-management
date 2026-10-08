// public/js/api.js — API client for the Smart Waste Management System

const API = (() => {
  const BASE = '/api';

  async function request(url) {
    const res = await fetch(BASE + url);
    if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
    return res.json();
  }

  async function patch(url, body = {}) {
    const res = await fetch(BASE + url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API PATCH error ${res.status}`);
    return res.json();
  }

  return {
    health:        ()           => request('/health'),
    kpis:          ()           => request('/analytics/kpis'),
    history:       (z, d = 30) => request(`/analytics/history?zone=${z || ''}&days=${d}`),
    complaints:    ()           => request('/analytics/complaints'),
    zones:         ()           => request('/zones'),
    zone:          id           => request(`/zones/${id}`),
    bins:          (q = '')     => request(`/bins${q}`),
    bin:           id           => request(`/bins/${id}`),
    emptyBin:      id           => patch(`/bins/${id}/empty`),
    anomalies:     ()           => request('/bins/anomalies'),
    vehicles:      ()           => request('/vehicles'),
    predictions:   (z, d = 7)  => request(`/predictions?zone=${z || ''}&days=${d}`),
    route:         z            => request(`/predictions/route?zone=${z || ''}`),
  };
})();
