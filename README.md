# 🚛 AI-Based Smart Waste Management & Collection Prediction System

A full-stack, responsive web application that uses **AI/ML algorithms** to predict waste collection needs, monitor bin fill levels in real-time, and optimise truck routes.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **npm** v9+

### Install & Run
```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# → http://localhost:3000
```

For **hot-reload** during development:
```bash
npm run dev
```

---

## 🧠 AI Engine

The prediction engine (`server/ai/predictor.js`) implements:

| Algorithm | Purpose |
|-----------|---------|
| **Linear Regression** | Trend detection on historical waste data |
| **Seasonal Decomposition** | Day-of-week demand patterns (weekends spike) |
| **90% Confidence Intervals** | Uncertainty bands on all forecasts |
| **Z-score Anomaly Detection** | Flags bins with abnormal fill spikes |
| **Greedy Nearest-Neighbour Routing** | Optimal truck collection route |

---

## 📡 REST API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Server health check |
| `GET /api/bins` | All bins (filter: `?zone=Z001&status=critical`) |
| `GET /api/bins/anomalies` | Anomalous bins detected by AI |
| `PATCH /api/bins/:id/empty` | Mark bin as emptied |
| `GET /api/zones` | All collection zones |
| `GET /api/vehicles` | Fleet status |
| `GET /api/predictions?zone=Z001&days=7` | AI waste prediction |
| `GET /api/predictions/route?zone=Z001` | Optimised collection route |
| `GET /api/analytics/kpis` | System KPI summary |
| `GET /api/analytics/history?days=30` | Historical waste data |
| `GET /api/analytics/complaints` | Complaint report |

---

## 🗂️ Project Structure

```
├── server/
│   ├── index.js              ← Express app entry point
│   ├── ai/
│   │   └── predictor.js      ← AI prediction engine
│   ├── data/
│   │   └── store.js          ← In-memory data store + seed data
│   └── routes/
│       ├── bins.js           ← /api/bins
│       ├── zones.js          ← /api/zones
│       ├── vehicles.js       ← /api/vehicles
│       ├── predictions.js    ← /api/predictions
│       └── analytics.js      ← /api/analytics
└── public/
    ├── index.html            ← Single-page application
    ├── css/style.css         ← Responsive dark-theme UI
    └── js/
        ├── api.js            ← Fetch API client
        ├── charts.js         ← Chart.js wrappers
        └── app.js            ← SPA controller
```

---

## 🖥️ Dashboard Pages

| Page | Features |
|------|---------|
| **Dashboard** | Live KPIs, 14-day trend, zone donut, bin map, alert feed |
| **Waste Bins** | Filterable bin grid, fill levels, empty-now action |
| **Zones & Areas** | Zone table with bin stats, critical counts |
| **Fleet Management** | Vehicle cards, load bars, fuel levels |
| **AI Predictions** | Forecast chart, confidence intervals, risk levels |
| **AI Insights** | Health score, recommendations, anomaly report |
| **Analytics** | 30-day trends, complaint breakdown, complaint table |

---

## 📱 Responsive Design

- **Desktop**: Full sidebar + multi-column layouts
- **Tablet**: Collapsed grids, 2-column cards
- **Mobile**: Hamburger sidebar, single-column, touch-friendly

---

## 🔧 Configuration

Create a `.env` file in the project root:
```
PORT=3000
NODE_ENV=production
```

---

## 🏗️ Production Upgrade Path

To move from the in-memory store to a real database:
1. Replace `server/data/store.js` with a **MongoDB/PostgreSQL** adapter
2. Add **JWT authentication** middleware
3. Connect real **IoT sensor webhooks** to `PATCH /api/bins/:id`
4. Deploy to **Docker / Kubernetes**

---

*Built with Node.js · Express · Chart.js · Vanilla JS*
