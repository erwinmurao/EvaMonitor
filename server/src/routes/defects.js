const express = require('express');
const { getDb, queueSync } = require('../db');
const { sendCSV } = require('../utils/csv');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { station_id, cycle_id, export: exportFormat } = req.query;
  let sql = `
    SELECT dl.*, dt.name as defect_type_name
    FROM defect_logs dl
    JOIN defect_types dt ON dt.id = dl.defect_type_id
    WHERE 1=1
  `;
  const params = [];
  if (station_id) { sql += ' AND dl.station_id = ?'; params.push(station_id); }
  if (cycle_id) { sql += ' AND dl.cycle_id = ?'; params.push(cycle_id); }
  sql += ' ORDER BY dl.logged_at DESC';
  
  const defects = db.prepare(sql).all(...params);
  
  if (exportFormat === 'csv') {
    return sendCSV(res, 'defects.csv', defects);
  }
  
  res.json(defects);
});

router.post('/', (req, res) => {
  const { cycle_id, station_id, mold_slot, defect_type_id, quantity, notes } = req.body;
  if (!station_id || !defect_type_id) return res.status(400).json({ error: 'station_id and defect_type_id required' });

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO defect_logs (cycle_id, station_id, mold_slot, defect_type_id, quantity, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(cycle_id || null, station_id, mold_slot || null, defect_type_id, quantity || 1, notes || '');
  queueSync('defect_logs', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: result.lastInsertRowid });
});

// Defect types CRUD
router.get('/types', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM defect_types ORDER BY name').all());
});

router.post('/types', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO defect_types (name) VALUES (?)').run(name);
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Defect type already exists' });
    throw err;
  }
});

module.exports = router;
