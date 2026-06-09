const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// Get all inventory levels
router.get('/', (req, res) => {
  const db = getDb();
  const { location, material_id, low_stock_only } = req.query;

  let sql = `
    SELECT mi.*, em.code, em.color, em.size_type, em.sack_size_kg, em.cost_per_kg,
      (mi.current_kg * em.cost_per_kg) as inventory_value
    FROM material_inventory mi
    JOIN eva_materials em ON em.id = mi.material_id
    WHERE 1=1
  `;
  const params = [];
  if (location) { sql += ' AND mi.location = ?'; params.push(location); }
  if (material_id) { sql += ' AND mi.material_id = ?'; params.push(material_id); }

  const thresholdKg = 100;
  if (low_stock_only === '1') {
    sql += ' AND mi.current_kg < ?';
    params.push(thresholdKg);
  }
  sql += ' ORDER BY em.code, em.color, em.size_type, mi.location';

  const inventory = db.prepare(sql).all(...params);

  for (const item of inventory) {
    if (item.size_type === 'Small') {
      item.estimated_pairs_producible = item.current_kg > 0
        ? Math.round(item.current_kg / 0.325)
        : 0;
    }
  }

  res.json(inventory);
});

// Get summary across all locations
router.get('/summary', (req, res) => {
  const db = getDb();
  const summary = db.prepare(`
    SELECT em.id as material_id, em.code, em.color, em.size_type, em.sack_size_kg, em.cost_per_kg,
      SUM(mi.current_kg) as total_kg, SUM(mi.current_sacks) as total_sacks,
      SUM(mi.current_kg * em.cost_per_kg) as total_value
    FROM eva_materials em
    LEFT JOIN material_inventory mi ON mi.material_id = em.id
    WHERE em.is_active = 1
    GROUP BY em.id
    ORDER BY em.code, em.color, em.size_type
  `).all();

  const thresholdKg = 100;
  const criticalKg = 25;
  for (const item of summary) {
    item.total_kg = item.total_kg || 0;
    item.total_sacks = item.total_sacks || 0;
    item.total_value = item.total_value || 0;
    item.stock_status = item.total_kg <= criticalKg ? 'critical' : item.total_kg <= thresholdKg ? 'low' : 'ok';
  }

  res.json(summary);
});

// Replenish inventory
router.post('/replenish', (req, res) => {
  const { material_id, location, kg, sacks, notes } = req.body;
  if (!material_id || !kg) return res.status(400).json({ error: 'material_id and kg required' });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM material_inventory WHERE material_id = ? AND location = ?')
    .get(material_id, location || 'Warehouse A');

  if (existing) {
    db.prepare(`UPDATE material_inventory SET current_kg = current_kg + ?, current_sacks = current_sacks + ?,
      last_replenished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(kg, sacks || 0, existing.id);
  } else {
    db.prepare(`INSERT INTO material_inventory (material_id, location, current_kg, current_sacks, last_replenished_at)
     VALUES (?, ?, ?, ?, datetime('now'))`).run(material_id, location || 'Warehouse A', kg, sacks || 0);
  }

  // Log transaction
  db.prepare(`INSERT INTO material_transactions (material_id, type, kg, sacks, notes)
   VALUES (?, 'replenish', ?, ?, ?)`).run(material_id, kg, sacks || 0, notes || 'Manual replenishment');

  queueSync('material_inventory', existing ? existing.id : 0, 'UPDATE');
  res.json({ replenished: true, material_id, kg });
});

// Transaction history
router.get('/transactions', (req, res) => {
  const db = getDb();
  const { material_id, type, limit } = req.query;
  let sql = `
    SELECT mt.*, em.code, em.color, em.size_type
    FROM material_transactions mt
    JOIN eva_materials em ON em.id = mt.material_id
    WHERE 1=1
  `;
  const params = [];
  if (material_id) { sql += ' AND mt.material_id = ?'; params.push(material_id); }
  if (type) { sql += ' AND mt.type = ?'; params.push(type); }
  sql += ' ORDER BY mt.timestamp DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(+limit); }
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Capacity planning: how many pairs before running out
router.get('/capacity', (req, res) => {
  const db = getDb();

  // Get inventory summary
  const invRows = db.prepare(`
    SELECT em.id, em.code, em.color, em.size_type, SUM(mi.current_kg) as total_kg
    FROM eva_materials em
    LEFT JOIN material_inventory mi ON mi.material_id = em.id
    WHERE em.is_active = 1
    GROUP BY em.id
  `).all();

  const invMap = {};
  for (const inv of invRows) {
    invMap[inv.id] = inv.total_kg || 0;
  }

  // Calculate per-recipe material consumption
  const recipes = db.prepare('SELECT * FROM recipes WHERE is_active = 1').all();
  const capacity = [];
  for (const recipe of recipes) {
    const smallAvailable = recipe.small_material_id ? (invMap[recipe.small_material_id] || 0) : 0;
    const bigAvailable = recipe.big_material_id ? (invMap[recipe.big_material_id] || 0) : 0;

    const smallPairs = recipe.small_kg > 0 ? Math.floor(smallAvailable / (recipe.injection_weight_grams / 1000 * (recipe.small_kg / (recipe.small_kg + recipe.big_kg)))) : Infinity;
    const bigPairs = recipe.big_kg > 0 ? Math.floor(bigAvailable / (recipe.injection_weight_grams / 1000 * (recipe.big_kg / (recipe.small_kg + recipe.big_kg)))) : Infinity;

    const maxPairs = Math.min(smallPairs, bigAvailable > 0 ? bigPairs : Infinity);

    capacity.push({
      recipe_id: Number(recipe.id),
      mold_id: Number(recipe.mold_id),
      material_code: recipe.material_code,
      material_color: recipe.material_color,
      size_label: recipe.size_label,
      small_available_kg: smallAvailable,
      big_available_kg: bigAvailable,
      max_pairs: maxPairs === Infinity ? null : maxPairs
    });
  }

  res.json(capacity);
});

module.exports = router;
