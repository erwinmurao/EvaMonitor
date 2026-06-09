const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// Get assignments for a line
router.get('/', (req, res) => {
  const db = getDb();
  const { line_id, station_id } = req.query;

  if (station_id) {
    const rows = db.prepare(`
      SELECT sma.*, m.name as mold_name, m.serial_code as mold_serial, m.expansion_ratio,
        r.cooking_time_seconds, r.injection_weight_grams, r.size_label, r.material_code, r.material_color
      FROM station_mold_assignments sma
      LEFT JOIN molds m ON m.id = sma.mold_id
      LEFT JOIN recipes r ON r.id = sma.recipe_id
      WHERE sma.station_id = ? AND sma.unassigned_at IS NULL
      ORDER BY sma.mold_slot
    `).all(station_id);
    return res.json(rows);
  }

  let sql = `
    SELECT sma.*, m.name as mold_name, m.serial_code as mold_serial, m.expansion_ratio,
      r.cooking_time_seconds, r.injection_weight_grams, r.size_label, r.material_code, r.material_color,
      s.station_number, s.line_id
    FROM station_mold_assignments sma
    JOIN stations s ON s.id = sma.station_id
    LEFT JOIN molds m ON m.id = sma.mold_id
    LEFT JOIN recipes r ON r.id = sma.recipe_id
    WHERE sma.unassigned_at IS NULL
  `;
  const params = [];
  if (line_id) { sql += ' AND s.line_id = ?'; params.push(line_id); }
  sql += ' ORDER BY s.line_id, s.station_number, sma.mold_slot';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Assign mold + recipe to a station slot
router.post('/', (req, res) => {
  const { station_id, mold_slot, mold_id, current_size, injection_feeder, recipe_id } = req.body;
  if (!station_id || !mold_slot) return res.status(400).json({ error: 'station_id and mold_slot required' });

  const db = getDb();

  // If recipe provided, check cooking time compatibility with the other slot
  if (recipe_id) {
    const recipe = db.prepare('SELECT cooking_time_seconds FROM recipes WHERE id = ?').get(recipe_id);
    const otherSlot = mold_slot === 'A' ? 'B' : 'A';
    const otherAssignment = db.prepare(`
      SELECT r.cooking_time_seconds FROM station_mold_assignments sma
      JOIN recipes r ON r.id = sma.recipe_id
      WHERE sma.station_id = ? AND sma.mold_slot = ? AND sma.unassigned_at IS NULL
    `).get(station_id, otherSlot);

    if (otherAssignment && recipe && otherAssignment.cooking_time_seconds !== recipe.cooking_time_seconds) {
      return res.status(409).json({
        error: 'Cooking time mismatch',
        message: `Mold ${mold_slot} recipe cook time (${recipe.cooking_time_seconds}s) does not match Mold ${otherSlot} (${otherAssignment.cooking_time_seconds}s). They must match because they cook together.`,
        slot_a_time: mold_slot === 'A' ? recipe.cooking_time_seconds : otherAssignment.cooking_time_seconds,
        slot_b_time: mold_slot === 'B' ? recipe.cooking_time_seconds : otherAssignment.cooking_time_seconds
      });
    }
  }

  // Upsert: unassign old, insert new
  db.prepare(`UPDATE station_mold_assignments SET unassigned_at = datetime('now')
   WHERE station_id = ? AND mold_slot = ? AND unassigned_at IS NULL`).run(station_id, mold_slot);

  const result = db.prepare(`INSERT INTO station_mold_assignments (station_id, mold_slot, mold_id, current_size, injection_feeder, recipe_id)
   VALUES (?, ?, ?, ?, ?, ?)`).run(station_id, mold_slot, mold_id || null, current_size || '', injection_feeder || 1, recipe_id || null);

  queueSync('station_mold_assignments', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: Number(result.lastInsertRowid), station_id, mold_slot });
});

// Unassign a slot
router.delete('/', (req, res) => {
  const { station_id, mold_slot } = req.query;
  if (!station_id || !mold_slot) return res.status(400).json({ error: 'station_id and mold_slot query params required' });

  const db = getDb();
  db.prepare(`UPDATE station_mold_assignments SET unassigned_at = datetime('now')
   WHERE station_id = ? AND mold_slot = ? AND unassigned_at IS NULL`).run(station_id, mold_slot);
  res.json({ unassigned: true });
});

module.exports = router;
