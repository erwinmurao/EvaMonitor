const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const molds = db.prepare('SELECT * FROM molds ORDER BY serial_code').all();
  res.json(molds);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const mold = db.prepare('SELECT * FROM molds WHERE id = ?').get(req.params.id);
  if (!mold) return res.status(404).json({ error: 'Mold not found' });
  res.json(mold);
});

router.get('/:id/recipes', (req, res) => {
  const db = getDb();
  const recipes = db.prepare('SELECT * FROM recipes WHERE mold_id = ? AND is_active = 1').all(req.params.id);
  res.json(recipes);
});

router.post('/', (req, res) => {
  const { serial_code, name, expansion_ratio, pairs_per_cycle, available_sizes, condition, notes } = req.body;
  if (!serial_code || !name) return res.status(400).json({ error: 'serial_code and name required' });

  const db = getDb();
  try {
    const result = db.prepare(
      `INSERT INTO molds (serial_code, name, expansion_ratio, pairs_per_cycle, available_sizes, condition, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(serial_code, name, expansion_ratio || 1.0, pairs_per_cycle || 2,
      JSON.stringify(available_sizes || []), condition || 'good', notes || '');
    queueSync('molds', result.lastInsertRowid, 'INSERT');
    res.status(201).json({ id: result.lastInsertRowid, serial_code, name });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Serial code already exists' });
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const mold = db.prepare('SELECT * FROM molds WHERE id = ?').get(req.params.id);
  if (!mold) return res.status(404).json({ error: 'Mold not found' });

  const { serial_code, name, expansion_ratio, pairs_per_cycle, available_sizes, condition, notes, is_active } = req.body;
  db.prepare(
    `UPDATE molds SET
      serial_code = COALESCE(?, serial_code),
      name = COALESCE(?, name),
      expansion_ratio = COALESCE(?, expansion_ratio),
      pairs_per_cycle = COALESCE(?, pairs_per_cycle),
      available_sizes = COALESCE(?, available_sizes),
      condition = COALESCE(?, condition),
      notes = COALESCE(?, notes),
      is_active = COALESCE(?, is_active)
    WHERE id = ?`
  ).run(serial_code, name, expansion_ratio, pairs_per_cycle,
    available_sizes ? JSON.stringify(available_sizes) : null,
    condition, notes, is_active, req.params.id);
  queueSync('molds', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, updated: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE molds SET is_active = 0 WHERE id = ?').run(req.params.id);
  queueSync('molds', req.params.id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
