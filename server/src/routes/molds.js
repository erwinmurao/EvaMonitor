const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { id, recipes } = req.query;

  if (recipes) {
    const rows = db.prepare('SELECT * FROM recipes WHERE mold_id = ? AND is_active = 1').all(recipes);
    return res.json(rows);
  }

  if (id) {
    const mold = db.prepare('SELECT * FROM molds WHERE id = ?').get(id);
    if (!mold) return res.status(404).json({ error: 'Mold not found' });
    return res.json(mold);
  }

  const molds = db.prepare('SELECT * FROM molds ORDER BY serial_code').all();
  res.json(molds);
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

router.put('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });

  const db = getDb();
  const mold = db.prepare('SELECT * FROM molds WHERE id = ?').get(id);
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
    condition, notes, is_active, id);
  queueSync('molds', id, 'UPDATE');
  res.json({ id: +id, updated: true });
});

router.delete('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const db = getDb();
  db.prepare('UPDATE molds SET is_active = 0 WHERE id = ?').run(id);
  queueSync('molds', id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
