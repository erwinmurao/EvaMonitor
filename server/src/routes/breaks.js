const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// List break events
router.get('/', (req, res) => {
  const db = getDb();
  const { line_id, shift_id, worker_id, active_only } = req.query;
  let sql = `
    SELECT be.*, bt.name as break_type_name, bt.is_line_level, w.name as worker_name
    FROM break_events be
    JOIN break_types bt ON bt.id = be.break_type_id
    LEFT JOIN workers w ON w.id = be.worker_id
    WHERE 1=1
  `;
  const params = [];
  if (line_id) { sql += ' AND be.line_id = ?'; params.push(line_id); }
  if (shift_id) { sql += ' AND be.shift_id = ?'; params.push(shift_id); }
  if (worker_id) { sql += ' AND be.worker_id = ?'; params.push(worker_id); }
  if (active_only === '1') { sql += ' AND be.ended_at IS NULL'; }
  sql += ' ORDER BY be.started_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Start break
router.post('/', (req, res) => {
  const { break_type_id, line_id, shift_id, worker_id, station_id, notes } = req.body;
  if (!break_type_id || !line_id || !shift_id) return res.status(400).json({ error: 'break_type_id, line_id, shift_id required' });

  const db = getDb();

  // Check for active break of same type for worker/line
  if (worker_id) {
    const active = db.prepare('SELECT id FROM break_events WHERE worker_id = ? AND ended_at IS NULL').get(worker_id);
    if (active) return res.status(409).json({ error: 'Worker already on break', active_break_id: Number(active.id) });
  }

  const result = db.prepare(`INSERT INTO break_events (break_type_id, line_id, shift_id, worker_id, station_id, started_at, notes)
   VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`).run(break_type_id, line_id, shift_id, worker_id || null, station_id || null, notes || '');
  queueSync('break_events', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: Number(result.lastInsertRowid), active: true });
});

// End break
router.put('/end', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });

  const db = getDb();
  const event = db.prepare('SELECT started_at FROM break_events WHERE id = ?').get(id);
  if (!event) return res.status(404).json({ error: 'Break event not found' });

  const now = new Date().toISOString();
  const started = new Date(event.started_at);
  const durationSeconds = Math.round((new Date(now) - started) / 1000);

  db.prepare('UPDATE break_events SET ended_at = ?, duration_seconds = ? WHERE id = ?').run(now, durationSeconds, id);
  queueSync('break_events', id, 'UPDATE');
  res.json({ id: +id, ended: true, duration_seconds: durationSeconds });
});

// End meal break for entire line
router.put('/end-meal', (req, res) => {
  const { line_id, shift_id } = req.query;
  if (!line_id || !shift_id) return res.status(400).json({ error: 'line_id and shift_id query params required' });

  const db = getDb();
  const result = db.prepare(`UPDATE break_events SET ended_at = datetime('now'),
    duration_seconds = CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER)
   WHERE line_id = ? AND shift_id = ? AND break_type_id = 1 AND ended_at IS NULL`).run(line_id, shift_id);
  res.json({ ended: true, count: result.changes });
});

// Break types
router.get('/types', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM break_types ORDER BY name').all();
  res.json(rows);
});

module.exports = router;
