const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const lines = db.prepare(`
    SELECT l.*, COUNT(s.id) as station_count
    FROM lines l
    LEFT JOIN stations s ON s.line_id = l.id
    GROUP BY l.id
  `).all();
  res.json(lines);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const line = db.prepare('SELECT * FROM lines WHERE id = ?').get(req.params.id);
  if (!line) return res.status(404).json({ error: 'Line not found' });
  res.json(line);
});

router.post('/', (req, res) => {
  const { name, num_stations } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const db = getDb();
  const result = db.prepare('INSERT INTO lines (name, num_stations) VALUES (?, ?)').run(name, num_stations || 8);
  queueSync('lines', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: result.lastInsertRowid, name, num_stations: num_stations || 8 });
});

router.put('/:id', (req, res) => {
  const { name, num_stations } = req.body;
  const db = getDb();
  db.prepare('UPDATE lines SET name = COALESCE(?, name), num_stations = COALESCE(?, num_stations) WHERE id = ?')
    .run(name, num_stations, req.params.id);
  queueSync('lines', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, updated: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM lines WHERE id = ?').run(req.params.id);
  queueSync('lines', req.params.id, 'DELETE');
  res.json({ deleted: true });
});

module.exports = router;
