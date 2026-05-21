const express = require('express');
const { getDb, queueSync } = require('../db');
const { sendCSV } = require('../utils/csv');
const router = express.Router();

// List downtime events
router.get('/', (req, res) => {
  const db = getDb();
  const { line_id, station_id, active_only, export: exportFormat } = req.query;
  let sql = `
    SELECT de.*, dt.name as downtime_type_name, dt.is_planned
    FROM downtime_events de
    JOIN downtime_types dt ON dt.id = de.downtime_type_id
    WHERE 1=1
  `;
  const params = [];
  if (line_id) { sql += ' AND de.line_id = ?'; params.push(line_id); }
  if (station_id) { sql += ' AND de.station_id = ?'; params.push(station_id); }
  if (active_only === '1') { sql += ' AND de.ended_at IS NULL'; }
  sql += ' ORDER BY de.started_at DESC';
  
  const downtime = db.prepare(sql).all(...params);
  
  if (exportFormat === 'csv') {
    return sendCSV(res, 'downtime.csv', downtime);
  }
  
  res.json(downtime);
});

// Start downtime
router.post('/', (req, res) => {
  const { line_id, station_id, downtime_type_id, notes } = req.body;
  if (!line_id || !downtime_type_id) return res.status(400).json({ error: 'line_id and downtime_type_id required' });

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO downtime_events (line_id, station_id, downtime_type_id, started_at, notes)
     VALUES (?, ?, ?, datetime('now'), ?)`
  ).run(line_id, station_id || null, downtime_type_id, notes || '');
  queueSync('downtime_events', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: result.lastInsertRowid, active: true });
});

// End downtime
router.put('/:id/end', (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT started_at FROM downtime_events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Downtime event not found' });

  const now = new Date().toISOString();
  const started = new Date(event.started_at);
  const durationSeconds = Math.round((new Date(now) - started) / 1000);

  db.prepare(
    `UPDATE downtime_events SET ended_at = ?, duration_seconds = ? WHERE id = ?`
  ).run(now, durationSeconds, req.params.id);
  queueSync('downtime_events', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, ended: true, duration_seconds: durationSeconds });
});

// Downtime types CRUD
router.get('/types', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM downtime_types ORDER BY name').all());
});

router.post('/types', (req, res) => {
  const { name, is_planned } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO downtime_types (name, is_planned) VALUES (?, ?)').run(name, is_planned ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Downtime type already exists' });
    throw err;
  }
});

module.exports = router;
