const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { initDb, getDb, closeDb } = require('./db');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

async function start() {
  // Initialize database (async for sql.js WASM loading)
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'eva-monitor.db');
  await initDb(dbPath);

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API routes
  const routes = [
    'auth', 'lines', 'stations', 'molds', 'eva-materials', 'recipes',
    'mold-assignments', 'station-config', 'eva-mixes', 'material-inventory',
    'cycles', 'defects', 'downtime', 'breaks', 'shifts', 'workers',
    'settings', 'reports', 'sync'
  ];

  for (const route of routes) {
    try {
      const router = require(`./routes/${route}`);
      app.use(`/api/${route}`, router);
    } catch (err) {
      console.warn(`[API] Route "${route}" not loaded: ${err.message}`);
    }
  }

  // Static serving — supports both dev (../kiosk) and Docker (../public/kiosk)
  const publicPath = path.join(__dirname, '..', 'public');
  const devKioskPath = path.join(__dirname, '..', '..', 'kiosk');
  const devAdminPath = path.join(__dirname, '..', '..', 'admin');

  const kioskPath = fs.existsSync(publicPath)
    ? path.join(publicPath, 'kiosk')
    : devKioskPath;
  const adminPath = fs.existsSync(publicPath)
    ? path.join(publicPath, 'admin')
    : devAdminPath;

  app.use('/kiosk', express.static(kioskPath));
  app.use('/admin', express.static(adminPath));
  app.use('/admin/*', (req, res) => {
    res.sendFile(path.join(adminPath, 'index.html'));
  });

  // Root redirect to kiosk
  app.get('/', (req, res) => {
    res.redirect('/kiosk/');
  });

  // Health check
  app.get('/api/health', (req, res) => {
    const db = getDb();
    const result = db.prepare('SELECT 1 as ok').get();
    res.json({
      status: 'ok',
      database: result && result.ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  // Start server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Kiosk:  http://localhost:${PORT}/kiosk/`);
    console.log(`[Server] Admin:  http://localhost:${PORT}/admin/`);
    console.log(`[Server] Health: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down...');
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

module.exports = app;
