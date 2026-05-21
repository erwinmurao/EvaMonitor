const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { is_active } = req.query;
  let sql = 'SELECT * FROM workers WHERE 1=1';
  const params = [];
  if (is_active !== undefined) { sql += ' AND is_active = ?'; params.push(is_active); }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const worker = db.prepare('SELECT id, name, is_active FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

router.post('/', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'name and pin required' });

  const db = getDb();
  const result = db.prepare('INSERT INTO workers (name, pin) VALUES (?, ?)').run(name, pin);
  queueSync('workers', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: result.lastInsertRowid, name });
});

router.put('/:id', (req, res) => {
  const { name, pin, is_active } = req.body;
  const db = getDb();
  db.prepare(
    `UPDATE workers SET name = COALESCE(?, name), pin = COALESCE(?, pin), is_active = COALESCE(?, is_active) WHERE id = ?`
  ).run(name, pin, is_active, req.params.id);
  queueSync('workers', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, updated: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE workers SET is_active = 0 WHERE id = ?').run(req.params.id);
  queueSync('workers', req.params.id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
