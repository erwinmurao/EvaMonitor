-- EVA Slipper Factory - Seed Data
-- Run after schema.sql

-- ============================================================
-- LINES
-- ============================================================
INSERT INTO lines (id, name, num_stations) VALUES
  (1, 'Line 1', 8),
  (2, 'Line 2', 6);

-- ============================================================
-- STATIONS
-- ============================================================
INSERT INTO stations (line_id, station_number) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
  (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6);

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (id, name, sort_order) VALUES
  (1, 'Operator', 1),
  (2, 'Helper', 2),
  (3, 'Trimmer', 3),
  (4, 'Packer', 4);

-- ============================================================
-- BREAK TYPES
-- ============================================================
INSERT INTO break_types (id, name, is_line_level) VALUES
  (1, 'Meal', 1),
  (2, 'Restroom', 0),
  (3, 'Personal', 0),
  (4, 'Other', 0);

-- ============================================================
-- DEFECT TYPES
-- ============================================================
INSERT INTO defect_types (id, name) VALUES
  (1, 'Short Shot'),
  (2, 'Surface Defect'),
  (3, 'Dimensional Issues'),
  (4, 'Flash'),
  (5, 'Burn Mark'),
  (6, 'Sink Mark'),
  (7, 'Other');

-- ============================================================
-- DOWNTIME TYPES
-- ============================================================
INSERT INTO downtime_types (id, name, is_planned) VALUES
  (1, 'Machine Maintenance', 1),
  (2, 'Mold Change', 1),
  (3, 'Material Shortage', 0),
  (4, 'Machine Breakdown', 0),
  (5, 'Power Outage', 0),
  (6, 'Quality Hold', 0),
  (7, 'Waiting for Material', 0),
  (8, 'Other', 0);

-- ============================================================
-- MOLDS
-- ============================================================
INSERT INTO molds (id, serial_code, name, expansion_ratio, pairs_per_cycle, available_sizes, condition) VALUES
  (1, 'M-001', 'Model 262', 1.65, 2, '["35-36","37-38","39-40","41-42"]', 'good'),
  (2, 'M-002', 'Model 262', 1.65, 2, '["35-36","37-38","39-40","41-42"]', 'good'),
  (3, 'M-003', 'Model 288', 1.70, 2, '["35-36","37-38","39-40","41-42"]', 'good'),
  (4, 'M-004', 'Model 288', 1.70, 2, '["35-36","37-38","39-40","41-42"]', 'good'),
  (5, 'M-005', 'Model 310', 1.75, 1, '["39-40","41-42","43-44"]', 'good'),
  (6, 'M-006', 'Model 310', 1.75, 1, '["39-40","41-42","43-44"]', 'good'),
  (7, 'M-007', 'Model 220', 1.55, 2, '["35-36","37-38"]', 'good'),
  (8, 'M-008', 'Model 220', 1.55, 2, '["35-36","37-38"]', 'good'),
  (9, 'M-009', 'Model 262', 1.65, 2, '["35-36","37-38","39-40","41-42"]', 'worn'),
  (10, 'M-010', 'Model 340', 1.80, 1, '["41-42","43-44","45-46"]', 'good');

-- ============================================================
-- EVA MATERIALS
-- ============================================================
INSERT INTO eva_materials (id, code, color, size_type, sack_size_kg, cost_per_kg) VALUES
  (1,  'H8003', 'Black',  'Small', 25.0, 3.50),
  (2,  'H8003', 'Black',  'Big',   50.0, 4.00),
  (3,  'H8003', 'White',  'Small', 25.0, 3.50),
  (4,  'H8003', 'White',  'Big',   50.0, 4.00),
  (5,  'B8003', 'Black',  'Small', 25.0, 3.80),
  (6,  'B8003', 'Black',  'Big',   50.0, 4.20),
  (7,  'B8003', 'White',  'Small', 25.0, 3.80),
  (8,  'B8003', 'White',  'Big',   50.0, 4.20),
  (9,  'H8010', 'Black',  'Small', 25.0, 3.60),
  (10, 'H8010', 'Black',  'Big',   50.0, 4.10),
  (11, 'H8010', 'White',  'Small', 25.0, 3.60),
  (12, 'H8010', 'White',  'Big',   50.0, 4.10);

-- ============================================================
-- MATERIAL INVENTORY (initial stock)
-- ============================================================
INSERT INTO material_inventory (material_id, location, current_kg, current_sacks) VALUES
  (1, 'Warehouse A', 500.0, 20),
  (2, 'Warehouse A', 1000.0, 20),
  (3, 'Warehouse A', 250.0, 10),
  (4, 'Warehouse A', 500.0, 10),
  (5, 'Warehouse A', 375.0, 15),
  (6, 'Warehouse A', 750.0, 15),
  (7, 'Warehouse A', 200.0, 8),
  (8, 'Warehouse A', 400.0, 8),
  (1, 'Line 1 Storage', 100.0, 4),
  (2, 'Line 1 Storage', 200.0, 4),
  (5, 'Line 1 Storage', 75.0, 3),
  (6, 'Line 1 Storage', 150.0, 3),
  (1, 'Line 2 Storage', 75.0, 3),
  (2, 'Line 2 Storage', 150.0, 3),
  (5, 'Line 2 Storage', 50.0, 2),
  (6, 'Line 2 Storage', 100.0, 2);

-- ============================================================
-- RECIPES
-- ============================================================
-- Model 262 + H8003 Black recipes
INSERT INTO recipes (id, mold_id, material_code, material_color, size_label, small_material_id, big_material_id, small_kg, big_kg, cooking_time_seconds, injection_weight_grams, expected_pairs) VALUES
  (1,  1, 'H8003', 'Black', '35-36', 1, 2, 5.0, 4.0, 350, 650, 2),
  (2,  1, 'H8003', 'Black', '37-38', 1, 2, 5.5, 4.5, 360, 680, 2),
  (3,  1, 'H8003', 'Black', '39-40', 1, 2, 6.0, 5.0, 370, 720, 2),
  (4,  1, 'H8003', 'Black', '41-42', 1, 2, 6.5, 5.5, 380, 760, 2),
  -- Model 262 + H8003 White recipes
  (5,  1, 'H8003', 'White', '35-36', 3, 4, 5.0, 4.0, 350, 650, 2),
  (6,  1, 'H8003', 'White', '37-38', 3, 4, 5.5, 4.5, 360, 680, 2),
  -- Model 262 + B8003 Black recipes
  (7,  1, 'B8003', 'Black', '35-36', 5, 6, 5.0, 4.0, 355, 655, 2),
  (8,  1, 'B8003', 'Black', '37-38', 5, 6, 5.5, 4.5, 365, 685, 2),
  -- Model 288 + H8003 Black recipes
  (9,  3, 'H8003', 'Black', '35-36', 1, 2, 5.5, 4.5, 360, 680, 2),
  (10, 3, 'H8003', 'Black', '37-38', 1, 2, 6.0, 5.0, 370, 720, 2),
  (11, 3, 'H8003', 'Black', '39-40', 1, 2, 6.5, 5.5, 380, 760, 2),
  -- Model 310 + H8003 Black recipes (1 pair per cycle)
  (12, 5, 'H8003', 'Black', '39-40', 1, 2, 7.0, 6.0, 400, 900, 1),
  (13, 5, 'H8003', 'Black', '41-42', 1, 2, 7.5, 6.5, 410, 950, 1),
  -- Model 220 + H8003 Black recipes
  (14, 7, 'H8003', 'Black', '35-36', 1, 2, 4.5, 3.5, 330, 580, 2),
  (15, 7, 'H8003', 'Black', '37-38', 1, 2, 5.0, 4.0, 340, 620, 2),
  -- Model 340 + H8003 Black recipes (1 pair per cycle)
  (16, 10, 'H8003', 'Black', '41-42', 1, 2, 8.0, 7.0, 420, 1000, 1),
  (17, 10, 'H8003', 'Black', '43-44', 1, 2, 8.5, 7.5, 430, 1050, 1),
  (18, 10, 'H8003', 'Black', '45-46', 1, 2, 9.0, 8.0, 440, 1100, 1),
  -- Duplicate recipes for mold M-002 (same Model 262)
  (19, 2, 'H8003', 'Black', '35-36', 1, 2, 5.0, 4.0, 350, 650, 2),
  (20, 2, 'H8003', 'Black', '37-38', 1, 2, 5.5, 4.5, 360, 680, 2),
  -- Model 288 + B8003 Black
  (21, 3, 'B8003', 'Black', '35-36', 5, 6, 5.5, 4.5, 365, 685, 2),
  -- Model 262 + H8010 Black
  (22, 1, 'H8010', 'Black', '35-36', 9, 10, 5.0, 4.0, 345, 645, 2),
  (23, 1, 'H8010', 'Black', '37-38', 9, 10, 5.5, 4.5, 355, 675, 2);

-- ============================================================
-- WORKERS
-- ============================================================
INSERT INTO workers (id, name, pin) VALUES
  (1, 'Ahmed', '1111'),
  (2, 'Hassan', '2222'),
  (3, 'Omar', '3333'),
  (4, 'Youssef', '4444'),
  (5, 'Ali', '5555'),
  (6, 'Ibrahim', '6666'),
  (7, 'Mohamed', '7777'),
  (8, 'Khaled', '8888');

-- ============================================================
-- SETTINGS
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('expansion_ratio_default', '1.65'),
  ('temp_alert_threshold_gun', '10'),
  ('temp_alert_threshold_mold', '15'),
  ('inventory_alert_threshold_kg', '100'),
  ('inventory_critical_threshold_kg', '25'),
  ('shift1_start', '06:00'),
  ('shift2_start', '14:00'),
  ('shift3_start', '22:00'),
  ('sync_interval_seconds', '30'),
  ('kiosk_idle_timeout_seconds', '300'),
  ('auto_return_seconds', '2'),
  ('cook_time_tolerance_percent', '5');
