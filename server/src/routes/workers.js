const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { id, is_active } = req.query;

  if (id) {
    const worker = db.prepare('SELECT id, name, is_active FROM workers WHERE id = ?').get(id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    return res.json(worker);
  }

  let sql = 'SELECT * FROM workers WHERE 1=1';
  const params = [];
  if (is_active !== undefined) { sql += ' AND is_active = ?'; params.push(is_active); }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'name and pin required' });

  const db = getDb();
  const result = db.prepare('INSERT INTO workers (name, pin) VALUES (?, ?)').run(name, pin);
  queueSync('workers', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: Number(result.lastInsertRowid), name });
});

router.put('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const { name, pin, is_active } = req.body;
  const db = getDb();
  db.prepare('UPDATE workers SET name = COALESCE(?, name), pin = COALESCE(?, pin), is_active = COALESCE(?, is_active) WHERE id = ?')
    .run(name, pin, is_active, id);
  queueSync('workers', id, 'UPDATE');
  res.json({ id: +id, updated: true });
});

router.delete('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const db = getDb();
  db.prepare('UPDATE workers SET is_active = 0 WHERE id = ?').run(id);
  queueSync('workers', id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
