const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { id } = req.query;
  if (id) {
    const line = db.prepare('SELECT * FROM lines WHERE id = ?').get(id);
    if (!line) return res.status(404).json({ error: 'Line not found' });
    return res.json(line);
  }
  const lines = db.prepare(`
    SELECT l.*, COUNT(s.id) as station_count
    FROM lines l
    LEFT JOIN stations s ON s.line_id = l.id
    GROUP BY l.id
  `).all();
  res.json(lines);
});

router.post('/', (req, res) => {
  const { name, num_stations } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const db = getDb();
  const result = db.prepare('INSERT INTO lines (name, num_stations) VALUES (?, ?)').run(name, num_stations || 8);
  queueSync('lines', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: result.lastInsertRowid, name, num_stations: num_stations || 8 });
});

router.put('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const { name, num_stations } = req.body;
  const db = getDb();
  db.prepare('UPDATE lines SET name = COALESCE(?, name), num_stations = COALESCE(?, num_stations) WHERE id = ?')
    .run(name, num_stations, id);
  queueSync('lines', id, 'UPDATE');
  res.json({ id: +id, updated: true });
});

router.delete('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const db = getDb();
  db.prepare('DELETE FROM lines WHERE id = ?').run(id);
  queueSync('lines', id, 'DELETE');
  res.json({ deleted: true });
});

module.exports = router;
