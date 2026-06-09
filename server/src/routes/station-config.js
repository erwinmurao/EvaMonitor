const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// Batch update station configuration
router.put('/batch', (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments)) return res.status(400).json({ error: 'assignments array required' });

  const db = getDb();
  const errors = [];
  const results = [];

  const processBatch = db.transaction(() => {
    for (const item of assignments) {
      const { station_id, mold_a_id, mold_b_id, recipe_a_id, recipe_b_id, mold_a_size, mold_b_size, feeder_a, feeder_b } = item;

      // Check cooking time compatibility
      if (recipe_a_id && recipe_b_id) {
        const rA = db.prepare('SELECT cooking_time_seconds FROM recipes WHERE id = ?').get(recipe_a_id);
        const rB = db.prepare('SELECT cooking_time_seconds FROM recipes WHERE id = ?').get(recipe_b_id);
        if (rA && rB && rA.cooking_time_seconds !== rB.cooking_time_seconds) {
          errors.push({
            station_id,
            error: `Cooking time mismatch: A=${rA.cooking_time_seconds}s, B=${rB.cooking_time_seconds}s`
          });
          continue;
        }
      }

      // Slot A
      db.prepare(`UPDATE station_mold_assignments SET unassigned_at = datetime('now')
        WHERE station_id = ? AND mold_slot = 'A' AND unassigned_at IS NULL`).run(station_id);
      if (mold_a_id) {
        const r = db.prepare(`INSERT INTO station_mold_assignments (station_id, mold_slot, mold_id, current_size, injection_feeder, recipe_id)
         VALUES (?, 'A', ?, ?, ?, ?)`).run(station_id, mold_a_id, mold_a_size || '', feeder_a || 1, recipe_a_id || null);
        queueSync('station_mold_assignments', r.lastInsertRowid, 'INSERT');
      }

      // Slot B
      db.prepare(`UPDATE station_mold_assignments SET unassigned_at = datetime('now')
        WHERE station_id = ? AND mold_slot = 'B' AND unassigned_at IS NULL`).run(station_id);
      if (mold_b_id) {
        const r = db.prepare(`INSERT INTO station_mold_assignments (station_id, mold_slot, mold_id, current_size, injection_feeder, recipe_id)
         VALUES (?, 'B', ?, ?, ?, ?)`).run(station_id, mold_b_id, mold_b_size || '', feeder_b || 2, recipe_b_id || null);
        queueSync('station_mold_assignments', r.lastInsertRowid, 'INSERT');
      }

      results.push({ station_id, updated: true });
    }
  });

  processBatch();

  if (errors.length > 0) {
    return res.status(207).json({ results, errors });
  }
  res.json({ results });
});

module.exports = router;
