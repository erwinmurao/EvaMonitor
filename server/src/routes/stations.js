const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { id, line_id } = req.query;

  if (id) {
    const station = db.prepare(`
      SELECT s.*, l.name as line_name,
        sma.mold_id as mold_a_id, sma.recipe_id as recipe_a_id, sma.current_size as mold_a_size,
        smb.mold_id as mold_b_id, smb.recipe_id as recipe_b_id, smb.current_size as mold_b_size
      FROM stations s
      JOIN lines l ON l.id = s.line_id
      LEFT JOIN station_mold_assignments sma ON sma.station_id = s.id AND sma.mold_slot = 'A'
      LEFT JOIN station_mold_assignments smb ON smb.station_id = s.id AND smb.mold_slot = 'B'
      WHERE s.id = ?
    `).get(id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    return res.json(station);
  }

  let stations;
  if (line_id) {
    stations = db.prepare(`
      SELECT s.*, l.name as line_name,
        sma.mold_id as mold_a_id, sma.recipe_id as recipe_a_id, sma.current_size as mold_a_size,
        smb.mold_id as mold_b_id, smb.recipe_id as recipe_b_id, smb.current_size as mold_b_size
      FROM stations s
      JOIN lines l ON l.id = s.line_id
      LEFT JOIN station_mold_assignments sma ON sma.station_id = s.id AND sma.mold_slot = 'A'
      LEFT JOIN station_mold_assignments smb ON smb.station_id = s.id AND smb.mold_slot = 'B'
      WHERE s.line_id = ?
      ORDER BY s.station_number
    `).all(line_id);
  } else {
    stations = db.prepare(`
      SELECT s.*, l.name as line_name,
        sma.mold_id as mold_a_id, sma.recipe_id as recipe_a_id, sma.current_size as mold_a_size,
        smb.mold_id as mold_b_id, smb.recipe_id as recipe_b_id, smb.current_size as mold_b_size
      FROM stations s
      JOIN lines l ON l.id = s.line_id
      LEFT JOIN station_mold_assignments sma ON sma.station_id = s.id AND sma.mold_slot = 'A'
      LEFT JOIN station_mold_assignments smb ON smb.station_id = s.id AND smb.mold_slot = 'B'
      ORDER BY l.id, s.station_number
    `).all();
  }
  res.json(stations);
});

router.post('/', (req, res) => {
  const { line_id, station_number } = req.body;
  if (!line_id || !station_number) return res.status(400).json({ error: 'line_id and station_number required' });

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO stations (line_id, station_number) VALUES (?, ?)').run(line_id, station_number);
    queueSync('stations', result.lastInsertRowid, 'INSERT');
    res.status(201).json({ id: result.lastInsertRowid, line_id, station_number });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Station number already exists for this line' });
    throw err;
  }
});

router.delete('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const db = getDb();
  db.prepare('DELETE FROM stations WHERE id = ?').run(id);
  queueSync('stations', id, 'DELETE');
  res.json({ deleted: true });
});

module.exports = router;
