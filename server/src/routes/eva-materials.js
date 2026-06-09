const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { id, inventory } = req.query;

  if (inventory) {
    const rows = db.prepare('SELECT * FROM material_inventory WHERE material_id = ?').all(inventory);
    return res.json(rows);
  }

  if (id) {
    const mat = db.prepare('SELECT * FROM eva_materials WHERE id = ?').get(id);
    if (!mat) return res.status(404).json({ error: 'Material not found' });
    return res.json(mat);
  }

  const materials = db.prepare('SELECT * FROM eva_materials ORDER BY code, color, size_type').all();
  res.json(materials);
});

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

router.put('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });

  const db = getDb();
  const { code, color, size_type, sack_size_kg, cost_per_kg, is_active } = req.body;
  db.prepare(
    `UPDATE eva_materials SET
      code = COALESCE(?, code), color = COALESCE(?, color),
      size_type = COALESCE(?, size_type), sack_size_kg = COALESCE(?, sack_size_kg),
      cost_per_kg = COALESCE(?, cost_per_kg), is_active = COALESCE(?, is_active)
    WHERE id = ?`
  ).run(code, color, size_type, sack_size_kg, cost_per_kg, is_active, id);
  queueSync('eva_materials', id, 'UPDATE');
  res.json({ id: +id, updated: true });
});

router.delete('/', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id query param required' });
  const db = getDb();
  db.prepare('UPDATE eva_materials SET is_active = 0 WHERE id = ?').run(id);
  queueSync('eva_materials', id, 'UPDATE');
  res.json({ deactivated: true });
});

module.exports = router;
