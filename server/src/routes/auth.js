const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

// Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'changeme';

  if (username === adminUser && password === adminPass) {
    const token = generateToken({ username, role: 'admin' });
    return res.json({ token, username, role: 'admin' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Worker login (for kiosk PIN-based auth)
router.post('/worker-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  const db = getDb();
  const worker = db.prepare('SELECT id, name, is_active FROM workers WHERE pin = ?').get(pin);
  if (!worker) return res.status(401).json({ error: 'Invalid PIN' });
  if (!worker.is_active) return res.status(403).json({ error: 'Worker inactive' });

  const token = generateToken({ workerId: worker.id, name: worker.name, role: 'worker' });
  res.json({ token, worker: { id: worker.id, name: worker.name } });
});

// Verify token
router.get('/verify', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'dev-secret');
    res.json({ valid: true, ...decoded });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
