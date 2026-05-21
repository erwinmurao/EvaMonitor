const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// List all recipes
router.get('/', (req, res) => {
  const db = getDb();
  const { mold_id, material_code, material_color } = req.query;
  let sql = `
    SELECT r.*, m.name as mold_name, m.serial_code as mold_serial, m.expansion_ratio as mold_expansion_ratio
    FROM recipes r
    JOIN molds m ON m.id = r.mold_id
    WHERE r.is_active = 1
  `;
  const params = [];
  if (mold_id) { sql += ' AND r.mold_id = ?'; params.push(mold_id); }
  if (material_code) { sql += ' AND r.material_code = ?'; params.push(material_code); }
  if (material_color) { sql += ' AND r.material_color = ?'; params.push(material_color); }
  sql += ' ORDER BY r.mold_id, r.material_code, r.material_color, r.size_label';

  const recipes = db.prepare(sql).all(...params);
  res.json(recipes);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const recipe = db.prepare(`
    SELECT r.*, m.name as mold_name, m.serial_code as mold_serial, m.expansion_ratio as mold_expansion_ratio
    FROM recipes r
    JOIN molds m ON m.id = r.mold_id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json(recipe);
});

// Lookup recipe by mold + material + size
router.post('/lookup', (req, res) => {
  const { mold_id, material_code, material_color, size_label } = req.body;
  if (!mold_id || !material_code) return res.status(400).json({ error: 'mold_id and material_code required' });

  const db = getDb();
  let sql = 'SELECT * FROM recipes WHERE mold_id = ? AND material_code = ? AND is_active = 1';
  const params = [mold_id, material_code];
  if (material_color) { sql += ' AND material_color = ?'; params.push(material_color); }
  if (size_label) { sql += ' AND size_label = ?'; params.push(size_label); }

  const recipes = db.prepare(sql).all(...params);
  res.json(recipes);
});

// Cost estimate for a recipe
router.get('/:id/cost', (req, res) => {
  const db = getDb();
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  const smallMat = recipe.small_material_id
    ? db.prepare('SELECT cost_per_kg FROM eva_materials WHERE id = ?').get(recipe.small_material_id)
    : null;
  const bigMat = recipe.big_material_id
    ? db.prepare('SELECT cost_per_kg FROM eva_materials WHERE id = ?').get(recipe.big_material_id)
    : null;

  const total_kg = recipe.small_kg + recipe.big_kg;
  const small_ratio = total_kg > 0 ? recipe.small_kg / total_kg : 0;
  const big_ratio = total_kg > 0 ? recipe.big_kg / total_kg : 0;
  const injection_kg = recipe.injection_weight_grams / 1000;

  const small_cost = smallMat ? injection_kg * small_ratio * smallMat.cost_per_kg : 0;
  const big_cost = bigMat ? injection_kg * big_ratio * bigMat.cost_per_kg : 0;

  res.json({
    recipe_id: recipe.id,
    injection_weight_kg: injection_kg,
    small_ratio: Math.round(small_ratio * 1000) / 1000,
    big_ratio: Math.round(big_ratio * 1000) / 1000,
    small_cost_per_pair: Math.round(small_cost * 100) / 100,
    big_cost_per_pair: Math.round(big_cost * 100) / 100,
    total_cost_per_pair: Math.round((small_cost + big_cost) * 100) / 100,
    estimated_pairs_per_loading: total_kg > 0
      ? Math.round(total_kg / injection_kg * recipe.expected_pairs)
      : 0
  });
});

router.post('/', (req, res) => {
  const { mold_id, material_code, material_color, size_label, small_material_id, big_material_id,
    small_kg, big_kg, cooking_time_seconds, injection_weight_grams, expected_pairs, notes } = req.body;
  if (!mold_id || !material_code || !material_color || !size_label || !cooking_time_seconds || !injection_weight_grams) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = getDb();
  try {
    const result = db.prepare(
      `INSERT INTO recipes (mold_id, material_code, material_color, size_label, small_material_id, big_material_id,
        small_kg, big_kg, cooking_time_seconds, injection_weight_grams, expected_pairs, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(mold_id, material_code, material_color, size_label, small_material_id || null,
      big_material_id || null, small_kg || 0, big_kg || 0, cooking_time_seconds,
      injection_weight_grams, expected_pairs || 2, notes || '');
    queueSync('recipes', result.lastInsertRowid, 'INSERT');
    res.status(201).json({ id: result.lastInsertRowid, mold_id, material_code, material_color, size_label });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Recipe already exists for this mold+material+size' });
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { mold_id, material_code, material_color, size_label, small_material_id, big_material_id,
    small_kg, big_kg, cooking_time_seconds, injection_weight_grams, expected_pairs, notes, is_active } = req.body;

  db.prepare(
    `UPDATE recipes SET
      mold_id = COALESCE(?, mold_id), material_code = COALESCE(?, material_code),
      material_color = COALESCE(?, material_color), size_label = COALESCE(?, size_label),
      small_material_id = COALESCE(?, small_material_id), big_material_id = COALESCE(?, big_material_id),
      small_kg = COALESCE(?, small_kg), big_kg = COALESCE(?, big_kg),
      cooking_time_seconds = COALESCE(?, cooking_time_seconds),
      injection_weight_grams = COALESCE(?, injection_weight_grams),
      expected_pairs = COALESCE(?, expected_pairs), notes = COALESCE(?, notes),
      is_active = COALESCE(?, is_active), updated_at = datetime('now')
    WHERE id = ?`
  ).run(mold_id, material_code, material_color, size_label, small_material_id, big_material_id,
    small_kg, big_kg, cooking_time_seconds, injection_weight_grams, expected_pairs, notes, is_active, req.params.id);
  queueSync('recipes', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, updated: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE recipes SET is_active = 0 WHERE id = ?').run(req.params.id);
  queueSync('recipes', req.params.id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
