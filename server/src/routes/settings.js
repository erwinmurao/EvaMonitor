const express = require('express');
const { getDb, getSetting, setSetting } = require('../db');
const router = express.Router();

// Get all settings
router.get('/', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all();
  const obj = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json(obj);
});

// Get single setting
router.get('/:key', (req, res) => {
  const value = getSetting(req.params.key);
  if (value === null) return res.status(404).json({ error: 'Setting not found' });
  res.json({ key: req.params.key, value });
});

// Update settings (batch)
router.put('/', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const results = [];
  for (const [key, value] of Object.entries(req.body)) {
    stmt.run(key, String(value));
    results.push({ key, value });
  }
  res.json({ updated: results });
});

// Update single setting
router.put('/:key', (req, res) => {
  const { value } = req.body;
  setSetting(req.params.key, value);
  res.json({ key: req.params.key, value });
});

module.exports = router;
