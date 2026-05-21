const express = require('express');
const { getDb, queueSync } = require('../db');
const router = express.Router();

// List shifts
router.get('/', (req, res) => {
  const db = getDb();
  const { line_id, shift_date, active_only } = req.query;
  let sql = 'SELECT * FROM shifts WHERE 1=1';
  const params = [];
  if (line_id) { sql += ' AND line_id = ?'; params.push(line_id); }
  if (shift_date) { sql += ' AND shift_date = ?'; params.push(shift_date); }
  if (active_only === '1') { sql += ' AND ended_at IS NULL'; }
  sql += ' ORDER BY shift_date DESC, shift_number';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  // Attach team
  shift.team = db.prepare(`
    SELECT stm.*, w.name as worker_name, r.name as role_name
    FROM shift_team_members stm
    JOIN workers w ON w.id = stm.worker_id
    JOIN roles r ON r.id = stm.role_id
    WHERE stm.shift_id = ? AND stm.is_active = 1
    ORDER BY r.sort_order
  `).all(req.params.id);
  res.json(shift);
});

// Start shift
router.post('/', (req, res) => {
  const { line_id, shift_date, shift_number } = req.body;
  if (!line_id) return res.status(400).json({ error: 'line_id required' });

  const db = getDb();
  const today = shift_date || new Date().toISOString().split('T')[0];

  // Auto-detect shift number if not provided
  let shiftNum = shift_number;
  if (!shiftNum) {
    const hour = new Date().getHours();
    shiftNum = hour < 14 ? 1 : hour < 22 ? 2 : 3;
  }

  try {
    const result = db.prepare(
      `INSERT INTO shifts (line_id, shift_date, shift_number, started_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).run(line_id, today, shiftNum);
    queueSync('shifts', result.lastInsertRowid, 'INSERT');
    res.status(201).json({ id: result.lastInsertRowid, line_id, shift_date: today, shift_number: shiftNum });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Shift already exists for this line/date/number' });
    throw err;
  }
});

// End shift
router.put('/:id/end', (req, res) => {
  const db = getDb();
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  // Count active team members by role
  const counts = db.prepare(`
    SELECT r.name as role_name, COUNT(*) as count
    FROM shift_team_members stm
    JOIN roles r ON r.id = stm.role_id
    WHERE stm.shift_id = ? AND stm.is_active = 1
    GROUP BY r.name
  `).all(req.params.id);

  const roleCounts = {};
  for (const c of counts) {
    roleCounts[c.role_name.toLowerCase()] = c.count;
  }

  db.prepare(
    `UPDATE shifts SET ended_at = datetime('now'),
      operator_count = ?, helper_count = ?, trimmer_count = ?, packer_count = ?
    WHERE id = ?`
  ).run(roleCounts['operator'] || 0, roleCounts['helper'] || 0, roleCounts['trimmer'] || 0, roleCounts['packer'] || 0, req.params.id);

  // Log out all team members
  db.prepare(
    `UPDATE shift_team_members SET logged_out_at = datetime('now'), is_active = 0
     WHERE shift_id = ? AND is_active = 1`
  ).run(req.params.id);

  queueSync('shifts', req.params.id, 'UPDATE');
  res.json({ id: +req.params.id, ended: true });
});

// Team check-in
router.post('/:id/checkin', (req, res) => {
  const { worker_id, role_id } = req.body;
  if (!worker_id || !role_id) return res.status(400).json({ error: 'worker_id and role_id required' });

  const db = getDb();
  // Check if already checked in
  const existing = db.prepare(
    'SELECT id FROM shift_team_members WHERE shift_id = ? AND worker_id = ? AND is_active = 1'
  ).get(req.params.id, worker_id);

  if (existing) return res.status(409).json({ error: 'Worker already checked in' });

  const result = db.prepare(
    `INSERT INTO shift_team_members (shift_id, worker_id, role_id)
     VALUES (?, ?, ?)`
  ).run(req.params.id, worker_id, role_id);
  queueSync('shift_team_members', result.lastInsertRowid, 'INSERT');
  res.status(201).json({ id: result.lastInsertRowid });
});

// Worker logout from shift
router.put('/:id/logout/:worker_id', (req, res) => {
  const db = getDb();
  db.prepare(
    `UPDATE shift_team_members SET logged_out_at = datetime('now'), is_active = 0
     WHERE shift_id = ? AND worker_id = ? AND is_active = 1`
  ).run(req.params.id, req.params.worker_id);
  queueSync('shift_team_members', req.params.id, 'UPDATE');
  res.json({ logged_out: true });
});

// Role reassignment
router.put('/:id/reassign', (req, res) => {
  const { worker_id, new_role_id, changed_by } = req.body;
  if (!worker_id || !new_role_id) return res.status(400).json({ error: 'worker_id and new_role_id required' });

  const db = getDb();
  const member = db.prepare(
    'SELECT id, role_id FROM shift_team_members WHERE shift_id = ? AND worker_id = ? AND is_active = 1'
  ).get(req.params.id, worker_id);

  if (!member) return res.status(404).json({ error: 'Active team member not found' });

  const oldRoleId = member.role_id;

  // Log the change
  db.prepare(
    `INSERT INTO role_change_log (shift_team_member_id, old_role_id, new_role_id, changed_by)
     VALUES (?, ?, ?, ?)`
  ).run(member.id, oldRoleId, new_role_id, changed_by || 'system');

  // Update role
  db.prepare('UPDATE shift_team_members SET role_id = ? WHERE id = ?').run(new_role_id, member.id);
  queueSync('shift_team_members', member.id, 'UPDATE');
  res.json({ reassigned: true, old_role_id: oldRoleId, new_role_id });
});

// Get roster for a shift
router.get('/:id/roster', (req, res) => {
  const db = getDb();
  const roster = db.prepare(`
    SELECT stm.*, w.name as worker_name, w.pin, r.name as role_name,
      (SELECT COUNT(*) FROM break_events WHERE worker_id = stm.worker_id AND shift_id = stm.shift_id AND ended_at IS NULL) as on_break
    FROM shift_team_members stm
    JOIN workers w ON w.id = stm.worker_id
    JOIN roles r ON r.id = stm.role_id
    WHERE stm.shift_id = ?
    ORDER BY r.sort_order, w.name
  `).all(req.params.id);
  res.json(roster);
});

module.exports = router;
