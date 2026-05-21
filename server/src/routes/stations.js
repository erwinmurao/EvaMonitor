const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { line_id } = req.query;
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

router.get('/:id', (req, res) => {
  const db = getDb();
  const station = db.prepare(`
    SELECT s.*, l.name as line_name,
      sma.mold_id as mold_a_id, sma.recipe_id as recipe_a_id, sma.current_size as mold_a_size,
      sma.mold_id as mold_b_id, smb.recipe_id as recipe_b_id, smb.current_size as mold_b_size
    FROM stations s
    JOIN lines l ON l.id = s.line_id
    LEFT JOIN station_mold_assignments sma ON sma.station_id = s.id AND sma.mold_slot = 'A'
    LEFT JOIN station_mold_assignments smb ON smb.station_id = s.id AND smb.mold_slot = 'B'
    WHERE s.id = ?
  `).get(req.params.id);
  if (!station) return res.status(404).json({ error: 'Station not found' });
  res.json(station);
});

module.exports = router;
