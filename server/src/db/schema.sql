-- EVA Slipper Factory Production Monitoring Schema
-- 20 tables

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  num_stations INTEGER NOT NULL DEFAULT 8,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL,
  station_number INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (line_id) REFERENCES lines(id),
  UNIQUE(line_id, station_number)
);

CREATE TABLE IF NOT EXISTS molds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  expansion_ratio REAL NOT NULL DEFAULT 1.0,
  pairs_per_cycle INTEGER NOT NULL DEFAULT 2,
  available_sizes TEXT DEFAULT '[]',
  condition TEXT NOT NULL DEFAULT 'good' CHECK(condition IN ('good','worn','damaged','retired')),
  notes TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- EVA MATERIAL TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS eva_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  color TEXT NOT NULL,
  size_type TEXT NOT NULL CHECK(size_type IN ('Small','Big')),
  sack_size_kg REAL NOT NULL DEFAULT 25.0,
  cost_per_kg REAL NOT NULL DEFAULT 0.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(code, color, size_type)
);

CREATE TABLE IF NOT EXISTS material_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  location TEXT NOT NULL DEFAULT 'Warehouse A',
  current_kg REAL NOT NULL DEFAULT 0.0,
  current_sacks INTEGER NOT NULL DEFAULT 0,
  last_replenished_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (material_id) REFERENCES eva_materials(id)
);

CREATE TABLE IF NOT EXISTS material_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('replenish','consume')),
  kg REAL NOT NULL,
  sacks INTEGER DEFAULT 0,
  reference_id TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  timestamp TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (material_id) REFERENCES eva_materials(id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mold_id INTEGER NOT NULL,
  material_code TEXT NOT NULL,
  material_color TEXT NOT NULL,
  size_label TEXT NOT NULL,
  small_material_id INTEGER,
  big_material_id INTEGER,
  small_kg REAL NOT NULL DEFAULT 0.0,
  big_kg REAL NOT NULL DEFAULT 0.0,
  cooking_time_seconds INTEGER NOT NULL,
  injection_weight_grams INTEGER NOT NULL,
  expected_pairs INTEGER NOT NULL DEFAULT 2,
  notes TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (mold_id) REFERENCES molds(id),
  FOREIGN KEY (small_material_id) REFERENCES eva_materials(id),
  FOREIGN KEY (big_material_id) REFERENCES eva_materials(id),
  UNIQUE(mold_id, material_code, material_color, size_label)
);

-- ============================================================
-- ASSIGNMENT & SHIFT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS station_mold_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  mold_slot TEXT NOT NULL CHECK(mold_slot IN ('A','B')),
  mold_id INTEGER,
  current_size TEXT DEFAULT '',
  injection_feeder INTEGER DEFAULT 1 CHECK(injection_feeder IN (1,2)),
  recipe_id INTEGER,
  assigned_at TEXT DEFAULT (datetime('now')),
  unassigned_at TEXT,
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (mold_id) REFERENCES molds(id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id),
  UNIQUE(station_id, mold_slot)
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL,
  shift_date TEXT NOT NULL,
  shift_number INTEGER NOT NULL CHECK(shift_number IN (1,2,3)),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  operator_count INTEGER DEFAULT 0,
  helper_count INTEGER DEFAULT 0,
  trimmer_count INTEGER DEFAULT 0,
  packer_count INTEGER DEFAULT 0,
  FOREIGN KEY (line_id) REFERENCES lines(id),
  UNIQUE(line_id, shift_date, shift_number)
);

CREATE TABLE IF NOT EXISTS shift_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  logged_in_at TEXT DEFAULT (datetime('now')),
  logged_out_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS role_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_team_member_id INTEGER NOT NULL,
  old_role_id INTEGER NOT NULL,
  new_role_id INTEGER NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  changed_by TEXT DEFAULT '',
  FOREIGN KEY (shift_team_member_id) REFERENCES shift_team_members(id),
  FOREIGN KEY (old_role_id) REFERENCES roles(id),
  FOREIGN KEY (new_role_id) REFERENCES roles(id)
);

-- ============================================================
-- PRODUCTION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS production_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  shift_id INTEGER NOT NULL,
  cycle_number INTEGER NOT NULL,
  mold_a_id INTEGER,
  mold_b_id INTEGER,
  recipe_a_id INTEGER,
  recipe_b_id INTEGER,
  mold_a_name TEXT DEFAULT '',
  mold_b_name TEXT DEFAULT '',
  mold_a_expansion_ratio REAL DEFAULT 0.0,
  mold_b_expansion_ratio REAL DEFAULT 0.0,
  mold_a_size TEXT DEFAULT '',
  mold_b_size TEXT DEFAULT '',
  eva_batch_feeder1_id INTEGER,
  eva_batch_feeder2_id INTEGER,
  target_cooking_seconds INTEGER,
  actual_cooking_seconds INTEGER,
  gun_temp_stage1 REAL,
  gun_temp_stage2 REAL,
  gun_temp_stage3 REAL,
  gun_temp_stage4 REAL,
  mold_temp REAL,
  injection_at TEXT DEFAULT (datetime('now')),
  mold_opened_at TEXT,
  cycle_done_at TEXT DEFAULT (datetime('now')),
  team_member_count INTEGER DEFAULT 0,
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (mold_a_id) REFERENCES molds(id),
  FOREIGN KEY (mold_b_id) REFERENCES molds(id),
  FOREIGN KEY (recipe_a_id) REFERENCES recipes(id),
  FOREIGN KEY (recipe_b_id) REFERENCES recipes(id)
);

CREATE TABLE IF NOT EXISTS cycle_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  mold_slot TEXT NOT NULL CHECK(mold_slot IN ('A','B')),
  mold_id INTEGER,
  size TEXT DEFAULT '',
  good_pairs INTEGER NOT NULL DEFAULT 0,
  bad_pairs INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (cycle_id) REFERENCES production_cycles(id),
  FOREIGN KEY (mold_id) REFERENCES molds(id)
);

-- ============================================================
-- MATERIAL & ISSUE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS eva_mix_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL,
  batch_code TEXT NOT NULL,
  material_code TEXT NOT NULL,
  material_color TEXT NOT NULL,
  recipe_id INTEGER,
  small_eva_kg REAL NOT NULL DEFAULT 0.0,
  big_eva_kg REAL NOT NULL DEFAULT 0.0,
  total_kg REAL NOT NULL DEFAULT 0.0,
  expansion_ratio REAL DEFAULT 0.0,
  injection_feeder INTEGER DEFAULT 1 CHECK(injection_feeder IN (1,2)),
  station_id INTEGER,
  mixed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (line_id) REFERENCES lines(id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id),
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS defect_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS defect_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER,
  station_id INTEGER NOT NULL,
  mold_slot TEXT CHECK(mold_slot IN ('A','B')),
  defect_type_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT DEFAULT '',
  logged_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES production_cycles(id),
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (defect_type_id) REFERENCES defect_types(id)
);

CREATE TABLE IF NOT EXISTS downtime_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_planned INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS downtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL,
  station_id INTEGER,
  downtime_type_id INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  notes TEXT DEFAULT '',
  FOREIGN KEY (line_id) REFERENCES lines(id),
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (downtime_type_id) REFERENCES downtime_types(id)
);

-- ============================================================
-- BREAK TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS break_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_line_level INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS break_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  break_type_id INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  shift_id INTEGER NOT NULL,
  worker_id INTEGER,
  station_id INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (break_type_id) REFERENCES break_types(id),
  FOREIGN KEY (line_id) REFERENCES lines(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- ============================================================
-- SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- SYNC TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
  payload TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stations_line ON stations(line_id);
CREATE INDEX IF NOT EXISTS idx_shifts_line_date ON shifts(line_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_team_shift ON shift_team_members(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_team_worker ON shift_team_members(worker_id);
CREATE INDEX IF NOT EXISTS idx_cycles_station_shift ON production_cycles(station_id, shift_id);
CREATE INDEX IF NOT EXISTS idx_cycles_shift ON production_cycles(shift_id);
CREATE INDEX IF NOT EXISTS idx_cycle_outputs_cycle ON cycle_outputs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_defect_logs_station ON defect_logs(station_id);
CREATE INDEX IF NOT EXISTS idx_defect_logs_cycle ON defect_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_line ON downtime_events(line_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_station ON downtime_events(station_id);
CREATE INDEX IF NOT EXISTS idx_break_events_shift ON break_events(shift_id);
CREATE INDEX IF NOT EXISTS idx_break_events_worker ON break_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_eva_batches_line ON eva_mix_batches(line_id);
CREATE INDEX IF NOT EXISTS idx_material_trans_type ON material_transactions(material_id, type);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced_at);
CREATE INDEX IF NOT EXISTS idx_assignments_station ON station_mold_assignments(station_id);
