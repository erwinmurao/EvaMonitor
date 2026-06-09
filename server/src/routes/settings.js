const express = require('express');
const { getDb, getSetting, setSetting } = require('../db');
const router = express.Router();

// Get all settings (or single setting by key query param)
router.get('/', (req, res) => {
  const { key } = req.query;
  if (key) {
    const value = getSetting(key);
    if (value === null) return res.status(404).json({ error: 'Setting not found' });
    return res.json({ key, value });
  }
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all();
  const obj = {};
  for (const s of rows) obj[s.key] = s.value;
  res.json(obj);
});

// Update settings (batch) or single setting (with key query param)
router.put('/', (req, res) => {
  const { key } = req.query;
  if (key) {
    const { value } = req.body;
    setSetting(key, value);
    return res.json({ key, value });
  }
  const db = getDb();
  const results = [];
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, value] of Object.entries(req.body)) {
    stmt.run(k, String(value));
    results.push({ key: k, value });
  }
  res.json({ updated: results });
});

module.exports = router;
