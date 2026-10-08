// server/data/store.js
// In-memory data store (replace with a real DB in production)

const { v4: uuidv4 } = require('uuid');

// ──────────────────────────────────────────────
// Zones / Areas
// ──────────────────────────────────────────────
const zones = [
  { id: 'Z001', name: 'Downtown Core',    lat: 40.7128,  lng: -74.0060, population: 12400, type: 'Commercial' },
  { id: 'Z002', name: 'North Residential',lat: 40.7282,  lng: -73.9942, population: 8700,  type: 'Residential'},
  { id: 'Z003', name: 'East Industrial',  lat: 40.7061,  lng: -73.9969, population: 3200,  type: 'Industrial' },
  { id: 'Z004', name: 'West Suburbs',     lat: 40.7489,  lng: -74.0045, population: 15600, type: 'Residential'},
  { id: 'Z005', name: 'South Market',     lat: 40.6892,  lng: -74.0445, population: 9100,  type: 'Commercial' },
  { id: 'Z006', name: 'Central Park Area',lat: 40.7851,  lng: -73.9683, population: 6200,  type: 'Mixed'      },
];

// ──────────────────────────────────────────────
// Waste Bins
// ──────────────────────────────────────────────
function makeBins() {
  const bins = [];
  const types = ['General', 'Recyclable', 'Organic', 'Hazardous'];
  let idx = 1;
  zones.forEach(zone => {
    const count = Math.floor(Math.random() * 4) + 4; // 4-7 bins per zone
    for (let i = 0; i < count; i++) {
      const fillLevel = Math.floor(Math.random() * 100);
      bins.push({
        id:          `BIN-${String(idx).padStart(4,'0')}`,
        zoneId:      zone.id,
        zoneName:    zone.name,
        type:        types[Math.floor(Math.random() * types.length)],
        capacity:    240, // litres
        fillLevel,        // 0-100 %
        lat:         zone.lat + (Math.random() - 0.5) * 0.02,
        lng:         zone.lng + (Math.random() - 0.5) * 0.02,
        lastEmptied: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
        sensor:      Math.random() > 0.15, // 85% have IoT sensors
        battery:     Math.floor(Math.random() * 60) + 40,
        alerts:      fillLevel >= 90 ? ['CRITICAL_FILL'] : fillLevel >= 75 ? ['HIGH_FILL'] : [],
        status:      fillLevel >= 90 ? 'Critical' : fillLevel >= 75 ? 'Warning' : 'Normal',
      });
      idx++;
    }
  });
  return bins;
}

// ──────────────────────────────────────────────
// Collection Vehicles
// ──────────────────────────────────────────────
const vehicles = [
  { id: 'TRK-01', name: 'Truck Alpha',   driver: 'James Carter',   capacity: 8000, currentLoad: 2400, status: 'Active',   zone: 'Z001', fuel: 78, lat: 40.7150, lng: -74.0100 },
  { id: 'TRK-02', name: 'Truck Beta',    driver: 'Maria Lopez',    capacity: 8000, currentLoad: 6200, status: 'Active',   zone: 'Z002', fuel: 45, lat: 40.7290, lng: -73.9900 },
  { id: 'TRK-03', name: 'Truck Gamma',   driver: 'David Kim',      capacity: 6000, currentLoad: 0,    status: 'Idle',     zone: 'Z003', fuel: 92, lat: 40.7070, lng: -73.9950 },
  { id: 'TRK-04', name: 'Truck Delta',   driver: 'Sarah Johnson',  capacity: 8000, currentLoad: 3800, status: 'Active',   zone: 'Z004', fuel: 61, lat: 40.7500, lng: -74.0020 },
  { id: 'TRK-05', name: 'Truck Epsilon', driver: 'Omar Hassan',    capacity: 6000, currentLoad: 5900, status: 'Returning',zone: 'Z005', fuel: 28, lat: 40.6900, lng: -74.0400 },
  { id: 'TRK-06', name: 'Compact Van',   driver: 'Lisa Park',      capacity: 3000, currentLoad: 0,    status: 'Maintenance', zone: null, fuel: 55, lat: 40.7200, lng: -74.0200 },
];

// ──────────────────────────────────────────────
// Historical daily waste data (last 30 days per zone)
// ──────────────────────────────────────────────
function generateHistory() {
  const history = [];
  const now = Date.now();
  zones.forEach(zone => {
    const base = zone.population * 0.0012; // kg per person per day avg
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now - d * 86400000);
      const dow  = date.getDay(); // 0=Sun
      const factor = [0.7, 0.9, 1.0, 1.05, 1.1, 1.3, 1.2][dow]; // weekend peaks
      const noise  = 0.85 + Math.random() * 0.3;
      history.push({
        zoneId: zone.id,
        date:   date.toISOString().split('T')[0],
        waste:  Math.round(base * factor * noise * 10) / 10,
        recycled: Math.round(base * factor * noise * 0.35 * 10) / 10,
        pickups: Math.ceil(base * factor * noise / 8),
      });
    }
  });
  return history;
}

// ──────────────────────────────────────────────
// Complaints / Reports
// ──────────────────────────────────────────────
const complaintTypes = ['Overflow','Missed Pickup','Damage','Smell','Illegal Dumping'];
function generateComplaints() {
  const c = [];
  for (let i = 0; i < 18; i++) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const daysAgo = Math.floor(Math.random() * 14);
    c.push({
      id:       uuidv4(),
      zoneId:   zone.id,
      zoneName: zone.name,
      type:     complaintTypes[Math.floor(Math.random() * complaintTypes.length)],
      status:   ['Open','In Progress','Resolved'][Math.floor(Math.random() * 3)],
      date:     new Date(Date.now() - daysAgo * 86400000).toISOString(),
      priority: ['Low','Medium','High'][Math.floor(Math.random() * 3)],
    });
  }
  return c;
}

let bins       = makeBins();
let history    = generateHistory();
let complaints = generateComplaints();

// Refresh bin fill levels every 2 min
setInterval(() => {
  bins = bins.map(b => {
    const delta = (Math.random() - 0.1) * 3; // mostly fills up
    const fill  = Math.min(100, Math.max(0, b.fillLevel + delta));
    const status = fill >= 90 ? 'Critical' : fill >= 75 ? 'Warning' : 'Normal';
    return { ...b, fillLevel: Math.round(fill), status, alerts: status !== 'Normal' ? [status.toUpperCase()+'_FILL'] : [] };
  });
}, 120000);

module.exports = { zones, bins: () => bins, vehicles, history: () => history, complaints: () => complaints };
