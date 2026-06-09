const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// List EVA mix batches
router.get('/', (req, res) => {
  const db = getDb();
  const { id, line_id, shift_id, limit } = req.query;

  if (id) {
    const batch = db.prepare('SELECT * FROM eva_mix_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    return res.json(batch);
  }

  let sql = 'SELECT * FROM eva_mix_batches WHERE 1=1';
  const params = [];
  if (line_id) { sql += ' AND line_id = ?'; params.push(line_id); }
  if (shift_id) { sql += ' AND shift_id = ?'; params.push(shift_id); }
  sql += ' ORDER BY mixed_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(+limit); }
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Create EVA mix batch — auto-decrements inventory
router.post('/', (req, res) => {
  const { line_id, material_code, material_color, recipe_id, small_eva_kg, big_eva_kg,
    expansion_ratio, injection_feeder, station_id } = req.body;
  if (!line_id || !material_code || !material_color) {
    return res.status(400).json({ error: 'line_id, material_code, material_color required' });
  }

  const db = getDb();

  // Get recipe details if provided
  let recipe = null;
  if (recipe_id) {
    recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipe_id);
  }

  const total_kg = (small_eva_kg || 0) + (big_eva_kg || 0);
  const batch_code = `BATCH-${Date.now()}`;

  const result = db.prepare(`INSERT INTO eva_mix_batches (line_id, batch_code, material_code, material_color, recipe_id,
    small_eva_kg, big_eva_kg, total_kg, expansion_ratio, injection_feeder, station_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    line_id, batch_code, material_code, material_color, recipe_id || null,
    small_eva_kg || 0, big_eva_kg || 0, total_kg,
    expansion_ratio || (recipe ? recipe.expansion_ratio : 0),
    injection_feeder || 1, station_id || null
  );

  // Auto-decrement inventory using transaction
  if (recipe) {
    const decrementInventory = db.transaction(() => {
      // Small material
      if (recipe.small_material_id && small_eva_kg > 0) {
        const smallInv = db.prepare(`SELECT id, current_kg FROM material_inventory
          WHERE material_id = ? AND location LIKE '%Storage' ORDER BY current_kg DESC LIMIT 1`).get(recipe.small_material_id);

        if (smallInv) {
          db.prepare(`UPDATE material_inventory SET current_kg = current_kg - ?, current_sacks = CAST((current_kg - ?) / (SELECT sack_size_kg FROM eva_materials WHERE id = ?) AS INTEGER), updated_at = datetime('now') WHERE id = ?`)
            .run(small_eva_kg, small_eva_kg, recipe.small_material_id, smallInv.id);
          db.prepare(`INSERT INTO material_transactions (material_id, type, kg, reference_id, notes) VALUES (?, 'consume', ?, ?, ?)`)
            .run(recipe.small_material_id, small_eva_kg, String(result.lastInsertRowid), 'EVA mix batch consumption');
        }
      }

      // Big material
      if (recipe.big_material_id && big_eva_kg > 0) {
        const bigInv = db.prepare(`SELECT id, current_kg FROM material_inventory
          WHERE material_id = ? AND location LIKE '%Storage' ORDER BY current_kg DESC LIMIT 1`).get(recipe.big_material_id);

        if (bigInv) {
          db.prepare(`UPDATE material_inventory SET current_kg = current_kg - ?, current_sacks = CAST((current_kg - ?) / (SELECT sack_size_kg FROM eva_materials WHERE id = ?) AS INTEGER), updated_at = datetime('now') WHERE id = ?`)
            .run(big_eva_kg, big_eva_kg, recipe.big_material_id, bigInv.id);
          db.prepare(`INSERT INTO material_transactions (material_id, type, kg, reference_id, notes) VALUES (?, 'consume', ?, ?, ?)`)
            .run(recipe.big_material_id, big_eva_kg, String(result.lastInsertRowid), 'EVA mix batch consumption');
        }
      }
    });

    decrementInventory();
  }

  queueSync('eva_mix_batches', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: Number(result.lastInsertRowid), batch_code, total_kg });
});

module.exports = router;
