const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// List all EVA materials
router.get('/', (req, res) => {
  const db = getDb();
  const materials = db.prepare('SELECT * FROM eva_materials ORDER BY code, color, size_type').all();
  res.json(materials);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const mat = db.prepare('SELECT * FROM eva_materials WHERE id = ?').get(req.params.id);
  if (!mat) return res.status(404).json({ error: 'Material not found' });
  res.json(mat);
});

// Get inventory for a material
router.get('/:id/inventory', (req, res) => {
  const db = getDb();
  const inventory = db.prepare('SELECT * FROM material_inventory WHERE material_id = ?').all(req.params.id);
  res.json(inventory);
});

// Quick Add Pair — creates both Small+Big at once
router.post('/quick-add-pair', (req, res) => {
  const { code, color, small_sack_size_kg, big_sack_size_kg, small_cost_per_kg, big_cost_per_kg } = req.body;
  if (!code || !color) return res.status(400).json({ error: 'code and color required' });

  const db = getDb();
  try {
    const insert = db.prepare(
      `INSERT INTO eva_materials (code, color, size_type, sack_size_kg, cost_per_kg)
       VALUES (?, ?, ?, ?, ?)`
    );
    const small = insert.run(code, color, 'Small', small_sack_size_kg || 25.0, small_cost_per_kg || 0);
    const big = insert.run(code, color, 'Big', big_sack_size_kg || 50.0, big_cost_per_kg || 0);
    queueSync('eva_materials', small.lastInsertRowid, 'INSERT');
    queueSync('eva_materials', big.lastInsertRowid, 'INSERT');
    res.status(201).json({
      small: { id: small.lastInsertRowid, code, color, size_type: 'Small' },
      big: { id: big.lastInsertRowid, code, color, size_type: 'Big' }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Material pair already exists' });
    throw err;
  }
});

router.post('/', (req, res) => {
  const { code, color, size_type, sack_size_kg, cost_per_kg } = req.body;
  if (!code || !color || !size_type) return res.status(400).json({ error: 'code, color, size_type required' });

  const db = getDb();
  try {
    const result = db.prepare(
      `INSERT INTO eva_materials (code, color, size_type, sack_size_kg, cost_per_kg)
       VALUES (?, ?, ?, ?, ?)`
    ).run(code, color, size_type, sack_size_kg || 25.0, cost_per_kg || 0);
    queueSync('eva_materials', result.lastInsertRowid, 'INSERT');
    res.status(201).json({ id: result.lastInsertRowid, code, color, size_type });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Material already exists' });
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { code, color, size_type, sack_size_kg, cost_per_kg, is_active } = req.body;
  db.prepare(
    `UPDATE eva_materials SET
      code = COALESCE(?, code), color = COALESCE(?, color),
      size_type = COALESCE(?, size_type), sack_size_kg = COALESCE(?, sack_size_kg),
      cost_per_kg = COALESCE(?, cost_per_kg), is_active = COALESCE(?, is_active)
    WHERE id = ?`
  ).run(code, color, size_type, sack_size_kg, cost_per_kg, is_active, req.params.id);
  queueSync('eva_materials', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, updated: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE eva_materials SET is_active = 0 WHERE id = ?').run(req.params.id);
  queueSync('eva_materials', req.params.id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
