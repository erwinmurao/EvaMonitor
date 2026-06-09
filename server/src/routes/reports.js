const express = require('express');
const { getDb, getSetting } = require('../db');
const router = express.Router();

// Production Overview KPIs
router.get('/overview', (req, res) => {
  const db = getDb();
  const { line_id, shift_date, shift_id } = req.query;

  let shiftFilter = '';
  const params = [];
  if (shift_id) { shiftFilter = ' AND pc.shift_id = ?'; params.push(shift_id); }
  else if (line_id && shift_date) {
    shiftFilter = ' AND pc.shift_id IN (SELECT id FROM shifts WHERE line_id = ? AND shift_date = ?)';
    params.push(line_id, shift_date);
  }

  // Cycle stats
  const cycleStats = db.prepare(`
    SELECT
      COUNT(*) as total_cycles,
      SUM(COALESCE((SELECT SUM(good_pairs) FROM cycle_outputs WHERE cycle_id = pc.id), 0)) as total_good_pairs,
      SUM(COALESCE((SELECT SUM(bad_pairs) FROM cycle_outputs WHERE cycle_id = pc.id), 0)) as total_bad_pairs
    FROM production_cycles pc
    WHERE 1=1 ${shiftFilter}
  `).get(...params);

  // Downtime stats
  let downtimeSql = 'SELECT COALESCE(SUM(duration_seconds), 0) as total_downtime_seconds FROM downtime_events WHERE ended_at IS NOT NULL';
  const downtimeParams = [];
  if (shift_id) {
    downtimeSql += ' AND line_id = (SELECT line_id FROM shifts WHERE id = ?)';
    downtimeParams.push(shift_id);
  } else if (line_id && !shift_id) {
    downtimeSql += ' AND line_id = ?';
    downtimeParams.push(line_id);
  }
  const downtimeStats = db.prepare(downtimeSql).get(...downtimeParams);

  // Break stats
  let breakSql = `
    SELECT
      COALESCE(SUM(CASE WHEN bt.is_line_level = 1 THEN duration_seconds ELSE 0 END), 0) as meal_break_seconds,
      COALESCE(SUM(CASE WHEN bt.is_line_level = 0 THEN duration_seconds ELSE 0 END), 0) as individual_break_seconds
    FROM break_events be
    JOIN break_types bt ON bt.id = be.break_type_id
    WHERE be.ended_at IS NOT NULL
  `;
  const breakParams = [];
  if (shift_id) {
    breakSql += ' AND be.shift_id = ?';
    breakParams.push(shift_id);
  }
  const breakStats = db.prepare(breakSql).get(...breakParams);

  const totalPairs = (cycleStats.total_good_pairs || 0) + (cycleStats.total_bad_pairs || 0);
  const qualityRate = totalPairs > 0 ? (cycleStats.total_good_pairs / totalPairs * 100) : 0;

  res.json({
    total_cycles: cycleStats.total_cycles || 0,
    total_good_pairs: cycleStats.total_good_pairs || 0,
    total_bad_pairs: cycleStats.total_bad_pairs || 0,
    quality_rate: Math.round(qualityRate * 10) / 10,
    total_downtime_seconds: downtimeStats.total_downtime_seconds || 0,
    meal_break_seconds: breakStats.meal_break_seconds || 0,
    individual_break_seconds: breakStats.individual_break_seconds || 0
  });
});

// Productive hours calculation
router.get('/productive-hours', (req, res) => {
  const db = getDb();
  const { shift_id, line_id, shift_date } = req.query;

  if (!shift_id && !(line_id && shift_date)) {
    return res.status(400).json({ error: 'shift_id or (line_id + shift_date) required' });
  }

  let shifts;
  if (shift_id) {
    shifts = [db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_id)].filter(Boolean);
  } else {
    shifts = db.prepare('SELECT * FROM shifts WHERE line_id = ? AND shift_date = ?').all(line_id, shift_date);
  }

  const results = [];
  for (const shift of shifts) {
    const shiftDuration = shift.ended_at
      ? (new Date(shift.ended_at) - new Date(shift.started_at)) / 1000
      : (Date.now() - new Date(shift.started_at).getTime()) / 1000;

    const mealBreaks = db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) as total FROM break_events
     WHERE shift_id = ? AND break_type_id = 1 AND ended_at IS NOT NULL`).get(shift.id);

    const indBreaks = db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) as total FROM break_events
     WHERE shift_id = ? AND break_type_id != 1 AND ended_at IS NOT NULL`).get(shift.id);

    const downtime = db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) as total FROM downtime_events
     WHERE line_id = ? AND started_at >= ? AND ended_at IS NOT NULL`).get(shift.line_id, shift.started_at);

    const productiveSeconds = shiftDuration - (mealBreaks.total || 0) - (downtime.total || 0);
    const productiveHours = Math.max(0, productiveSeconds / 3600);

    results.push({
      shift_id: Number(shift.id),
      line_id: Number(shift.line_id),
      shift_number: shift.shift_number,
      shift_duration_hours: Math.round(shiftDuration / 3600 * 100) / 100,
      meal_break_hours: Math.round((mealBreaks.total || 0) / 3600 * 100) / 100,
      individual_break_hours: Math.round((indBreaks.total || 0) / 3600 * 100) / 100,
      downtime_hours: Math.round((downtime.total || 0) / 3600 * 100) / 100,
      productive_hours: Math.round(productiveHours * 100) / 100,
      productive_pct: shiftDuration > 0 ? Math.round(productiveSeconds / shiftDuration * 1000) / 10 : 0
    });
  }

  res.json(results);
});

// Cycle efficiency
router.get('/cycle-efficiency', (req, res) => {
  const db = getDb();
  const { shift_id, line_id, shift_date } = req.query;

  let shiftFilter = '';
  const params = [];
  if (shift_id) { shiftFilter = ' AND pc.shift_id = ?'; params.push(shift_id); }

  const cycles = db.prepare(`
    SELECT pc.*, s.station_number, s.line_id
    FROM production_cycles pc
    JOIN stations s ON s.id = pc.station_id
    WHERE 1=1 ${shiftFilter}
    ORDER BY pc.cycle_done_at
  `).all(...params);

  const tolerancePct = parseFloat(getSetting('cook_time_tolerance_percent') || '5') / 100;

  let compliantCycles = 0;
  for (const c of cycles) {
    if (c.target_cooking_seconds && c.actual_cooking_seconds) {
      const diff = Math.abs(c.actual_cooking_seconds - c.target_cooking_seconds) / c.target_cooking_seconds;
      if (diff <= tolerancePct) compliantCycles++;
    }
  }

  const recipeCompliance = cycles.length > 0 && compliantCycles > 0
    ? Math.round(compliantCycles / cycles.length * 1000) / 10 : null;

  let tempFilter = 'WHERE gun_temp_stage1 IS NOT NULL';
  if (shiftFilter) tempFilter += shiftFilter.replace('pc.', '');
  const tempAnalysis = db.prepare(`
    SELECT
      AVG(gun_temp_stage1) as avg_gun1, AVG(gun_temp_stage2) as avg_gun2,
      AVG(gun_temp_stage3) as avg_gun3, AVG(gun_temp_stage4) as avg_gun4,
      AVG(mold_temp) as avg_mold_temp,
      MIN(gun_temp_stage1) as min_gun1, MAX(gun_temp_stage1) as max_gun1,
      MIN(gun_temp_stage2) as min_gun2, MAX(gun_temp_stage2) as max_gun2,
      MIN(gun_temp_stage3) as min_gun3, MAX(gun_temp_stage3) as max_gun3,
      MIN(gun_temp_stage4) as min_gun4, MAX(gun_temp_stage4) as max_gun4,
      MIN(mold_temp) as min_mold_temp, MAX(mold_temp) as max_mold_temp
    FROM production_cycles
    ${tempFilter}
  `).get(...params);

  res.json({
    total_cycles: cycles.length,
    recipe_compliance_pct: recipeCompliance,
    temperature_analysis: tempAnalysis
  });
});

// EVA consumption report
router.get('/eva-consumption', (req, res) => {
  const db = getDb();
  const { line_id } = req.query;

  let filter = '';
  const params = [];
  if (line_id) { filter += ' AND emb.line_id = ?'; params.push(line_id); }

  const byMaterial = db.prepare(`
    SELECT emb.material_code, emb.material_color,
      COUNT(*) as batch_count,
      SUM(emb.small_eva_kg) as total_small_kg,
      SUM(emb.big_eva_kg) as total_big_kg,
      SUM(emb.total_kg) as total_kg
    FROM eva_mix_batches emb
    WHERE 1=1 ${filter}
    GROUP BY emb.material_code, emb.material_color
    ORDER BY emb.material_code, emb.material_color
  `).all(...params);

  const costByMaterial = [];
  for (const mat of byMaterial) {
    const smallMat = db.prepare("SELECT cost_per_kg FROM eva_materials WHERE code = ? AND color = ? AND size_type = 'Small' AND is_active = 1")
      .get(mat.material_code, mat.material_color);
    const bigMat = db.prepare("SELECT cost_per_kg FROM eva_materials WHERE code = ? AND color = ? AND size_type = 'Big' AND is_active = 1")
      .get(mat.material_code, mat.material_color);

    costByMaterial.push({
      material_code: mat.material_code,
      material_color: mat.material_color,
      total_kg: mat.total_kg,
      small_cost_per_kg: smallMat?.cost_per_kg || 0,
      big_cost_per_kg: bigMat?.cost_per_kg || 0
    });
  }

  res.json({ by_material: byMaterial, cost_by_material: costByMaterial });
});

// Teams report
router.get('/teams', (req, res) => {
  const db = getDb();
  const { shift_id, line_id, shift_date } = req.query;

  let shiftFilter = '';
  const params = [];
  if (shift_id) { shiftFilter = ' AND s.id = ?'; params.push(shift_id); }
  else if (line_id && shift_date) { shiftFilter = ' AND s.line_id = ? AND s.shift_date = ?'; params.push(line_id, shift_date); }

  const shiftsList = db.prepare(`SELECT s.* FROM shifts s WHERE 1=1 ${shiftFilter} ORDER BY s.shift_date DESC, s.shift_number`).all(...params);

  const results = [];
  for (const shift of shiftsList) {
    const team = db.prepare(`
      SELECT stm.worker_id, w.name, r.name as role_name,
        stm.logged_in_at, stm.logged_out_at, stm.is_active
      FROM shift_team_members stm
      JOIN workers w ON w.id = stm.worker_id
      JOIN roles r ON r.id = stm.role_id
      WHERE stm.shift_id = ?
    `).all(shift.id);

    const goodPairs = db.prepare(`
      SELECT COALESCE(SUM(co.good_pairs), 0) as total
      FROM cycle_outputs co
      JOIN production_cycles pc ON pc.id = co.cycle_id
      WHERE pc.shift_id = ?
    `).get(shift.id);

    const shiftDuration = shift.ended_at
      ? (new Date(shift.ended_at) - new Date(shift.started_at)) / 3600000
      : (Date.now() - new Date(shift.started_at).getTime()) / 3600000;

    results.push({
      ...shift,
      team,
      good_pairs: goodPairs.total || 0,
      shift_duration_hours: Math.round(shiftDuration * 100) / 100,
      pairs_per_hour: shiftDuration > 0 ? Math.round((goodPairs.total || 0) / shiftDuration * 10) / 10 : 0
    });
  }

  res.json(results);
});

module.exports = router;
