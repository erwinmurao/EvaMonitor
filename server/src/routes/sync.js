const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// Batch sync from kiosk
router.post('/batch', (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records array required' });

  const db = getDb();
  const results = { synced: 0, errors: [] };

  const syncRecord = db.transaction((items) => {
    for (const item of items) {
      try {
        const { table_name, action, payload } = item;
        if (!table_name || !action || !payload) {
          results.errors.push({ item, error: 'Missing required fields' });
          continue;
        }

        // Apply the change
        switch (action) {
          case 'INSERT': {
            const cols = Object.keys(payload).join(', ');
            const vals = Object.keys(payload).map(() => '?').join(', ');
            const stmt = db.prepare(`INSERT OR REPLACE INTO ${table_name} (${cols}) VALUES (${vals})`);
            stmt.run(...Object.values(payload));
            break;
          }
          case 'UPDATE': {
            const sets = Object.keys(payload).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
            const vals = [...Object.keys(payload).filter(k => k !== 'id').map(k => payload[k]), payload.id];
            db.prepare(`UPDATE ${table_name} SET ${sets} WHERE id = ?`).run(...vals);
            break;
          }
          case 'DELETE': {
            db.prepare(`DELETE FROM ${table_name} WHERE id = ?`).run(payload.id);
            break;
          }
        }
        results.synced++;
      } catch (err) {
        results.errors.push({ item, error: err.message });
      }
    }
  });

  syncRecord(records);
  res.json(results);
});

// Get unsynced records
router.get('/pending', (req, res) => {
  const db = getDb();
  const pending = db.prepare('SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at').all();
  res.json(pending);
});

// Mark as synced
router.put('/mark-synced', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });

  const db = getDb();
  const stmt = db.prepare('UPDATE sync_queue SET synced_at = datetime(\'now\') WHERE id = ?');
  for (const id of ids) stmt.run(id);
  res.json({ marked: ids.length });
});

module.exports = router;
