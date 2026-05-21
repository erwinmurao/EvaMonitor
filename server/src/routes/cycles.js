const express = require('express');
const { getDb, queueSync } = require('../db');
const { sendCSV } = require('../utils/csv');
const router = express.Router();

// List production cycles
router.get('/', (req, res) => {
  const db = getDb();
  const { station_id, shift_id, line_id, limit, offset, export: exportFormat } = req.query;
  let sql = `
    SELECT pc.*, s.station_number, s.line_id
    FROM production_cycles pc
    JOIN stations s ON s.id = pc.station_id
    WHERE 1=1
  `;
  const params = [];
  if (station_id) { sql += ' AND pc.station_id = ?'; params.push(station_id); }
  if (shift_id) { sql += ' AND pc.shift_id = ?'; params.push(shift_id); }
  if (line_id) { sql += ' AND s.line_id = ?'; params.push(line_id); }
  sql += ' ORDER BY pc.cycle_done_at DESC';
  if (limit && !exportFormat) { sql += ' LIMIT ?'; params.push(+limit); }
  if (offset && !exportFormat) { sql += ' OFFSET ?'; params.push(+offset); }

  const cycles = db.prepare(sql).all(...params);

  // Attach outputs for each cycle
  for (const cycle of cycles) {
    cycle.outputs = db.prepare('SELECT * FROM cycle_outputs WHERE cycle_id = ?').all(cycle.id);
  }

  if (exportFormat === 'csv') {
    const flatCycles = cycles.map(c => ({
      id: c.id,
      station_number: c.station_number,
      line_id: c.line_id,
      shift_id: c.shift_id,
      cycle_number: c.cycle_number,
      mold_a_name: c.mold_a_name,
      mold_b_name: c.mold_b_name,
      target_cooking_seconds: c.target_cooking_seconds,
      actual_cooking_seconds: c.actual_cooking_seconds,
      gun_temp_stage1: c.gun_temp_stage1,
      gun_temp_stage2: c.gun_temp_stage2,
      gun_temp_stage3: c.gun_temp_stage3,
      gun_temp_stage4: c.gun_temp_stage4,
      mold_temp: c.mold_temp,
      team_member_count: c.team_member_count,
      cycle_done_at: c.cycle_done_at
    }));
    return sendCSV(res, 'cycles.csv', flatCycles);
  }

  res.json(cycles);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const cycle = db.prepare(`
    SELECT pc.*, s.station_number, s.line_id
    FROM production_cycles pc
    JOIN stations s ON s.id = pc.station_id
    WHERE pc.id = ?
  `).get(req.params.id);
  if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
  cycle.outputs = db.prepare('SELECT * FROM cycle_outputs WHERE cycle_id = ?').all(cycle.id);
  res.json(cycle);
});

// Get last cycle for a station (for temperature pre-fill)
router.get('/last/:station_id', (req, res) => {
  const db = getDb();
  const cycle = db.prepare(`
    SELECT gun_temp_stage1, gun_temp_stage2, gun_temp_stage3, gun_temp_stage4, mold_temp
    FROM production_cycles WHERE station_id = ?
    ORDER BY cycle_done_at DESC LIMIT 1
  `).get(req.params.station_id);
  res.json(cycle || {});
});

// Create a production cycle
router.post('/', (req, res) => {
  const {
    station_id, shift_id, cycle_number,
    mold_a_id, mold_b_id, recipe_a_id, recipe_b_id,
    mold_a_name, mold_b_name, mold_a_expansion_ratio, mold_b_expansion_ratio,
    mold_a_size, mold_b_size,
    eva_batch_feeder1_id, eva_batch_feeder2_id,
    target_cooking_seconds, actual_cooking_seconds,
    gun_temp_stage1, gun_temp_stage2, gun_temp_stage3, gun_temp_stage4, mold_temp,
    injection_at, mold_opened_at, team_member_count,
    outputs
  } = req.body;

  if (!station_id || !shift_id) return res.status(400).json({ error: 'station_id and shift_id required' });

  const db = getDb();

  const insertCycle = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO production_cycles (
        station_id, shift_id, cycle_number,
        mold_a_id, mold_b_id, recipe_a_id, recipe_b_id,
        mold_a_name, mold_b_name, mold_a_expansion_ratio, mold_b_expansion_ratio,
        mold_a_size, mold_b_size,
        eva_batch_feeder1_id, eva_batch_feeder2_id,
        target_cooking_seconds, actual_cooking_seconds,
        gun_temp_stage1, gun_temp_stage2, gun_temp_stage3, gun_temp_stage4, mold_temp,
        injection_at, mold_opened_at, team_member_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      station_id, shift_id, cycle_number || 0,
      mold_a_id || null, mold_b_id || null, recipe_a_id || null, recipe_b_id || null,
      mold_a_name || '', mold_b_name || '', mold_a_expansion_ratio || 0, mold_b_expansion_ratio || 0,
      mold_a_size || '', mold_b_size || '',
      eva_batch_feeder1_id || null, eva_batch_feeder2_id || null,
      target_cooking_seconds || null, actual_cooking_seconds || null,
      gun_temp_stage1 || null, gun_temp_stage2 || null, gun_temp_stage3 || null, gun_temp_stage4 || null, mold_temp || null,
      injection_at || null, mold_opened_at || null, team_member_count || 0
    );

    const cycleId = result.lastInsertRowid;

    // Insert outputs
    if (Array.isArray(outputs)) {
      const insertOutput = db.prepare(
        `INSERT INTO cycle_outputs (cycle_id, mold_slot, mold_id, size, good_pairs, bad_pairs)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const out of outputs) {
        insertOutput.run(cycleId, out.mold_slot, out.mold_id || null, out.size || '', out.good_pairs || 0, out.bad_pairs || 0);
      }
    }

    queueSync('production_cycles', cycleId, 'INSERT');
    return cycleId;
  });

  const cycleId = insertCycle();
  res.status(201).json({ id: cycleId });
});

module.exports = router;
