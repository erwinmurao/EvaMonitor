# EVA Monitor — Production Monitoring System
## Complete Technical Specification

---

## 1. System Architecture Overview

### 1.1 Technology Stack
- **Backend**: Node.js 20 (Alpine)
- **Database**: SQLite 3 (better-sqlite3, WAL mode)
- **Frontend - Admin**: Vanilla JS (SPA, dynamic routing)
- **Frontend - Kiosk**: Vanilla JS (PWA, offline-first, service worker)
- **Reverse Proxy**: Caddy (TLS-ready, compression, caching)
- **Container**: Docker + docker-compose

### 1.2 Deployment Model
```
Internet
  ↓
Caddy (port 80/443)
  ↓
Express Server (port 3000, Node.js)
  ├─→ Admin UI (/admin)
  ├─→ Kiosk UI (/kiosk)
  └─→ API Routes (/api/*)
  ↓
SQLite Database (persistent volume)
  ├─→ /app/data/eva-monitor.db
  └─→ Backups: /app/backups
```

---

## 2. Database Schema (20 Tables)

### 2.1 Core Production Tables

#### `lines` (Production Lines)
- `id` INTEGER PRIMARY KEY
- `name` TEXT (e.g., "Line A")
- `num_stations` INTEGER (default: 8)
- `created_at` TIMESTAMP

#### `stations` (Workstations per Line)
- `id` INTEGER PRIMARY KEY
- `line_id` FOREIGN KEY → lines
- `station_number` INTEGER (1-8 typically)
- `created_at` TIMESTAMP
- **UNIQUE**: (line_id, station_number)

#### `shifts` (Daily Shifts)
- `id` INTEGER PRIMARY KEY
- `line_id` FOREIGN KEY → lines
- `shift_date` TEXT (YYYY-MM-DD)
- `shift_number` INTEGER (1, 2, or 3)
- `started_at`, `ended_at` TIMESTAMP
- `operator_count`, `helper_count`, `trimmer_count`, `packer_count` INTEGER
- **UNIQUE**: (line_id, shift_date, shift_number)

### 2.2 Worker & Team Tables

#### `workers` (Factory Workers)
- `id` INTEGER PRIMARY KEY
- `name` TEXT
- `pin` TEXT (4-6 digit authentication)
- `is_active` INTEGER (1 = active, 0 = deactivated)
- `created_at` TIMESTAMP

#### `roles` (Worker Roles)
- `id` INTEGER PRIMARY KEY
- `name` TEXT UNIQUE (Operator, Helper, Trimmer, Packer)
- `is_active` INTEGER
- `sort_order` INTEGER (display priority)

#### `shift_team_members` (Active Team Assignment)
- `id` INTEGER PRIMARY KEY
- `shift_id` FOREIGN KEY → shifts
- `worker_id` FOREIGN KEY → workers
- `role_id` FOREIGN KEY → roles
- `logged_in_at`, `logged_out_at` TIMESTAMP
- `is_active` INTEGER (1 = currently working, 0 = clocked out)

#### `role_change_log` (Audit Trail)
- `id` INTEGER PRIMARY KEY
- `shift_team_member_id` FOREIGN KEY
- `old_role_id`, `new_role_id` FOREIGN KEY → roles
- `changed_at` TIMESTAMP
- `changed_by` TEXT

### 2.3 Mold & Material Tables

#### `molds` (Injection Molds)
- `id` INTEGER PRIMARY KEY
- `serial_code` TEXT UNIQUE
- `name` TEXT
- `expansion_ratio` REAL (material expansion factor)
- `pairs_per_cycle` INTEGER (default: 2)
- `available_sizes` TEXT (JSON array: ["5", "6", "7", "8", "9"])
- `condition` TEXT (good, worn, damaged, retired)
- `notes` TEXT
- `is_active` INTEGER
- `created_at` TIMESTAMP

#### `eva_materials` (EVA Pellet/Sack Types)
- `id` INTEGER PRIMARY KEY
- `code` TEXT (product code)
- `color` TEXT (Black, White, Red, etc.)
- `size_type` TEXT (Small or Big)
- `sack_size_kg` REAL (default: 25.0)
- `cost_per_kg` REAL
- `is_active` INTEGER
- `created_at` TIMESTAMP
- **UNIQUE**: (code, color, size_type)

#### `material_inventory` (Stock Levels)
- `id` INTEGER PRIMARY KEY
- `material_id` FOREIGN KEY → eva_materials
- `location` TEXT (Warehouse A, B, etc.)
- `current_kg` REAL
- `current_sacks` INTEGER
- `last_replenished_at`, `updated_at` TIMESTAMP

#### `material_transactions` (Consume/Replenish Log)
- `id` INTEGER PRIMARY KEY
- `material_id` FOREIGN KEY → eva_materials
- `type` TEXT (replenish or consume)
- `kg` REAL
- `sacks` INTEGER
- `reference_id` TEXT (cycle_id for consume)
- `notes` TEXT
- `timestamp`, `created_at` TIMESTAMP

#### `recipes` (Mold + Material Combinations)
- `id` INTEGER PRIMARY KEY
- `mold_id` FOREIGN KEY → molds
- `material_code`, `material_color` TEXT
- `size_label` TEXT (e.g., "Size 7")
- `small_material_id`, `big_material_id` FOREIGN KEY → eva_materials
- `small_kg`, `big_kg` REAL (composition)
- `cooking_time_seconds` INTEGER (target cook time)
- `injection_weight_grams` INTEGER
- `expected_pairs` INTEGER (default: 2)
- `notes` TEXT
- `is_active` INTEGER
- `created_at`, `updated_at` TIMESTAMP
- **UNIQUE**: (mold_id, material_code, material_color, size_label)

### 2.4 Equipment Assignment Tables

#### `station_mold_assignments` (Mold A/B per Station)
- `id` INTEGER PRIMARY KEY
- `station_id` FOREIGN KEY → stations
- `mold_slot` TEXT (A or B)
- `mold_id` FOREIGN KEY → molds
- `current_size` TEXT
- `injection_feeder` INTEGER (1 or 2)
- `recipe_id` FOREIGN KEY → recipes
- `assigned_at`, `unassigned_at` TIMESTAMP
- **UNIQUE**: (station_id, mold_slot)

#### `eva_mix_batches` (Pre-mixed Material Batches)
- `id` INTEGER PRIMARY KEY
- `line_id` FOREIGN KEY → lines
- `batch_code` TEXT
- `material_code`, `material_color` TEXT
- `recipe_id` FOREIGN KEY → recipes
- `small_eva_kg`, `big_eva_kg`, `total_kg` REAL
- `expansion_ratio` REAL
- `injection_feeder` INTEGER (1 or 2)
- `station_id` FOREIGN KEY → stations
- `mixed_at` TIMESTAMP

### 2.5 Production Cycle Tables

#### `production_cycles` (Single Injection Cycle)
- `id` INTEGER PRIMARY KEY
- `station_id` FOREIGN KEY → stations
- `shift_id` FOREIGN KEY → shifts
- `cycle_number` INTEGER (incremental per station/shift)
- `mold_a_id`, `mold_b_id` FOREIGN KEY → molds
- `recipe_a_id`, `recipe_b_id` FOREIGN KEY → recipes
- `mold_a_name`, `mold_b_name`, `mold_a_size`, `mold_b_size` TEXT
- `mold_a_expansion_ratio`, `mold_b_expansion_ratio` REAL
- `eva_batch_feeder1_id`, `eva_batch_feeder2_id` FOREIGN KEY → eva_mix_batches
- `target_cooking_seconds`, `actual_cooking_seconds` INTEGER
- `gun_temp_stage1`, `gun_temp_stage2`, `gun_temp_stage3`, `gun_temp_stage4`, `mold_temp` REAL
- `injection_at`, `mold_opened_at`, `cycle_done_at` TIMESTAMP
- `team_member_count` INTEGER
- **INDEX**: (station_id, shift_id)

#### `cycle_outputs` (Good/Bad Pairs per Cycle)
- `id` INTEGER PRIMARY KEY
- `cycle_id` FOREIGN KEY → production_cycles
- `mold_slot` TEXT (A or B)
- `mold_id` FOREIGN KEY → molds
- `size` TEXT
- `good_pairs` INTEGER
- `bad_pairs` INTEGER

### 2.6 Issue & Downtime Tables

#### `defect_types` (Taxonomy)
- `id` INTEGER PRIMARY KEY
- `name` TEXT UNIQUE (Bubble, Shrinkage, Discoloration, etc.)
- `is_active` INTEGER

#### `defect_logs` (Recorded Defects)
- `id` INTEGER PRIMARY KEY
- `cycle_id` FOREIGN KEY → production_cycles (nullable)
- `station_id` FOREIGN KEY → stations
- `mold_slot` TEXT (A or B, nullable)
- `defect_type_id` FOREIGN KEY → defect_types
- `quantity` INTEGER (number of defective pairs)
- `notes` TEXT
- `logged_at` TIMESTAMP

#### `downtime_types` (Taxonomy)
- `id` INTEGER PRIMARY KEY
- `name` TEXT UNIQUE (Maintenance, Setup, Repair, etc.)
- `is_planned` INTEGER (1 = scheduled, 0 = unplanned)
- `is_active` INTEGER

#### `downtime_events` (Recorded Downtime)
- `id` INTEGER PRIMARY KEY
- `line_id` FOREIGN KEY → lines
- `station_id` FOREIGN KEY → stations (nullable for line-level)
- `downtime_type_id` FOREIGN KEY → downtime_types
- `started_at`, `ended_at` TIMESTAMP
- `duration_seconds` INTEGER
- `notes` TEXT

### 2.7 Break Tables

#### `break_types` (Taxonomy)
- `id` INTEGER PRIMARY KEY
- `name` TEXT UNIQUE (Meal Break, Restroom, Fatigue, etc.)
- `is_line_level` INTEGER (1 = entire line, 0 = individual worker)
- `is_active` INTEGER

#### `break_events` (Recorded Breaks)
- `id` INTEGER PRIMARY KEY
- `break_type_id` FOREIGN KEY → break_types
- `line_id` FOREIGN KEY → lines
- `shift_id` FOREIGN KEY → shifts
- `worker_id` FOREIGN KEY → workers (nullable for line breaks)
- `station_id` FOREIGN KEY → stations (nullable)
- `started_at`, `ended_at` TIMESTAMP
- `duration_seconds` INTEGER
- `notes` TEXT
- `created_at` TIMESTAMP
- **INDEX**: (shift_id), (worker_id)

### 2.8 Config & Sync Tables

#### `settings` (Key-Value Configuration)
- `key` TEXT PRIMARY KEY
- `value` TEXT
- Examples: `cook_time_tolerance_percent`, `temp_alert_threshold_gun`

#### `sync_queue` (Offline Data Replication)
- `id` INTEGER PRIMARY KEY
- `table_name` TEXT (which table was modified)
- `record_id` INTEGER (ID of modified record)
- `action` TEXT (INSERT, UPDATE, or DELETE)
- `payload` TEXT (JSON of the change)
- `created_at` TIMESTAMP
- `synced_at` TIMESTAMP (NULL until sent to kiosk)
- **INDEX**: (synced_at)

---

## 3. API Routes (18 Modules)

### 3.1 Authentication Routes (`/api/auth`)
- **POST /login** — Admin login (username/password)
  - Returns: `{ token, username, role: 'admin' }`
- **POST /worker-pin** — Worker kiosk login (PIN-based)
  - Returns: `{ token, worker: { id, name } }`
- **GET /verify** — Verify JWT token
  - Returns: `{ valid: true, workerId?, username?, role }`

### 3.2 Production Routes

#### `/api/cycles` (Production Cycles)
- **GET /** — List cycles (filter by station_id, shift_id, line_id, export as CSV)
  - Response: `[{ id, cycle_number, mold_a_name, outputs: [...], ... }]`
- **GET /:id** — Get cycle with outputs
- **GET /last/:station_id** — Last temps (for pre-fill)
- **POST /** — Record new cycle
  - Body: `{ station_id, shift_id, cycle_number, outputs: [{mold_slot, good_pairs, bad_pairs}], ... }`

#### `/api/shifts` (Shift Management)
- **GET /** — List shifts (filter by line_id, shift_date, active_only)
- **GET /:id** — Get shift with team
- **GET /:id/roster** — Get team roster (includes break status)
- **POST /** — Start new shift
- **PUT /:id/end** — End shift (auto-count roles, log out team)
- **POST /:id/checkin** — Worker checks in
  - Body: `{ worker_id, role_id }`
- **PUT /:id/reassign** — Reassign worker role (logs change)
  - Body: `{ worker_id, new_role_id, changed_by }`

#### `/api/workers`
- **GET /** — List workers (filter by is_active)
- **GET /:id** — Get worker
- **POST /** — Create worker (name, pin)
- **PUT /:id** — Update worker
- **DELETE /:id** — Deactivate worker (soft delete)

#### `/api/stations`
- **GET /** — List stations (filter by line_id)
- **GET /:id** — Get station

#### `/api/molds`
- **GET /** — List molds
- **POST /** — Create mold (serial_code, name, expansion_ratio, etc.)
- **PUT /:id** — Update mold
- **DELETE /:id** — Deactivate mold

#### `/api/recipes`
- **GET /** — List recipes (filter by mold_id, material_code)
- **POST /** — Create recipe (mold_id, material composition, cooking time)
- **PUT /:id** — Update recipe

#### `/api/eva-materials`
- **GET /** — List EVA materials
- **POST /** — Create material (code, color, size_type, cost_per_kg)

#### `/api/material-inventory`
- **GET /** — List inventory levels
- **POST /consume** — Log consumption (by cycle_id)
- **POST /replenish** — Log replenishment

#### `/api/defects`
- **GET /** — List defect logs (export to CSV)
- **POST /** — Log defect
- **GET /types** — List defect types
- **POST /types** — Create defect type

#### `/api/downtime`
- **GET /** — List downtime events
- **POST /** — Start downtime
- **PUT /:id/end** — End downtime

#### `/api/breaks`
- **GET /** — List break events
- **POST /** — Start break (line or worker)
- **PUT /:id/end** — End break

#### `/api/mold-assignments`
- **GET /** — List assignments (filter by station_id, line_id)
- **POST /** — Assign mold to station slot
- **PUT /:id** — Update assignment

#### `/api/station-config`
- **GET /** — Get station configuration
- **PUT /** — Update configuration

#### `/api/reports`
- **GET /overview** — KPIs (total cycles, good pairs, quality rate, downtime, breaks)
- **GET /productive-hours** — Shift productivity calculation
- **GET /cycle-efficiency** — Recipe compliance & temperature analysis
- **GET /eva-consumption** — Material usage by material/color
- **GET /teams** — Team productivity (pairs per hour)

#### `/api/sync`
- **POST /batch** — Batch sync from kiosk (INSERT/UPDATE/DELETE)
  - Body: `{ records: [{ table_name, action, payload }, ...] }`
  - Returns: `{ synced: 5, errors: [...] }`
- **GET /pending** — Get unsynced records (for kiosk offline queue)
- **PUT /mark-synced** — Mark records as synced

#### `/api/settings`
- **GET /** — All settings
- **PUT /:key** — Update setting value

---

## 4. Admin Dashboard (SPA)

### 4.1 Architecture
- **Entry**: `/admin/index.html`
- **Router**: `/admin/js/app.js`
- **Pages**: 15 dynamic modules in `/admin/js/pages/`
- **State**: localStorage-based JWT token
- **Pattern**: Each page module exports `render()` and `init()` functions

### 4.2 Page Modules
1. **overview** — Dashboard KPIs (total cycles, quality rate, productivity)
2. **stations** — Station details, current assignments, cycle history
3. **eva-consumption** — Material usage by type/color, cost analysis
4. **cycle-efficiency** — Recipe compliance %,temperature analysis
5. **defects** — Defect trend analysis, breakdown by type/station
6. **downtime** — Downtime breakdown (planned vs unplanned), duration analysis
7. **breaks** — Break patterns, meal vs individual breakdown
8. **teams** — Team roster, productivity (pairs/hour), role assignments
9. **eva-inventory** — Current stock, replenishment history
10. **molds** — Mold inventory, condition tracking, utilization
11. **eva-materials** — Material catalog, pricing, size types
12. **recipes** — Recipe management (mold + material combos), cooking params
13. **station-config** — Station assignments, mold mapping
14. **workers** — Worker directory, PINs, role history
15. **settings** — Configuration (tolerances, thresholds, backup interval)

### 4.3 Navigation Structure
```
Production (6 pages)
├── Production Overview
├── Station Detail
├── EVA Consumption
├── Cycle Efficiency
├── Defect Analysis
├── Downtime Analysis
└── Break Analysis

People (1 page)
├── Teams

Materials (4 pages)
├── EVA Inventory
├── Molds
├── EVA Materials
└── Recipes

Configuration (3 pages)
├── Station Config
├── Workers
└── Settings
```

### 4.4 Mobile Responsiveness
- Sidebar drawer (toggles on <768px)
- Breadcrumb navigation
- Responsive tables + cards
- Touch-friendly buttons (min 44px)

---

## 5. Kiosk Display (PWA)

### 5.1 Architecture
- **Entry**: `/kiosk/index.html`
- **Router**: `/kiosk/js/app.js`
- **Screens**: 10 dynamic modules in `/kiosk/js/screens/`
- **State**: localStorage (LocalDB class)
- **Offline**: Service Worker + IndexedDB cache + sync queue
- **Idle Timeout**: Auto-return to station-selector after 5 min inactivity

### 5.2 Screen Flow
```
shift-start (PIN entry)
  ↓
team-checkin (role assignment)
  ↓
station-selector (HOME) ← 5 min idle returns here
  ├─→ station-menu (select mold slots, recipe)
  │    ├─→ cycle-done (record cycle: temps, times, outputs)
  │    │    ├─→ defect-report (log defects)
  │    │    └─→ back to station-selector
  │    └─→ back to station-selector
  ├─→ eva-mix (pre-mix material tracking)
  ├─→ downtime (record equipment downtime)
  ├─→ team-roster (view team + individual breaks)
  ├─→ role-reassign (change worker roles mid-shift)
  └─→ END SHIFT (return to shift-start)
```

### 5.3 Screens

#### `shift-start`
- PIN entry to start shift
- Auto-detect shift number (1, 2, or 3 based on time)
- Creates shift record in DB

#### `team-checkin`
- 4-column worker grid
- Select role (Operator, Helper, Trimmer, Packer)
- PIN entry validation
- "All Done" to proceed

#### `station-selector` (HOME)
- **Fixed 4x4 or 3x3 grid** (8 or 6 cards respectively)
- Card per station showing:
  - Status dot (green/red/yellow/purple)
  - Mold A & B recipes
  - Cycle count
  - Team avatars (tap to toggle break)
- Top bar actions: MEAL, EVA MIX, DOWN TIME, TEAM (🔔), END SHIFT
- Click card to enter station

#### `station-menu`
- Show current mold assignments (A, B)
- Verify recipe
- "Start Cycle" button

#### `cycle-done`
- Input: target cooking time (pre-filled from recipe)
- Input: actual cooking time
- Input: gun temps (stage 1-4), mold temp
- Input: outputs (good/bad pairs for mold A & B)
- On submit: creates cycle record, increments cycle count

#### `defect-report`
- Multi-select defect types
- Quantity per defect
- Notes
- Submit creates defect logs

#### `eva-mix`
- Select material code + color
- Input: small EVA kg, big EVA kg
- Input: expansion ratio
- Input: injection feeder (1 or 2)
- Submit creates eva_mix_batch

#### `downtime`
- Select downtime type (Maintenance, Setup, Repair, etc.)
- Toggle: line-level or station-level
- Notes
- On submit: starts downtime event

#### `team-roster`
- Display shift team by role
- Show who's on break (warning border)
- Tap member: toggle individual break

#### `role-reassign`
- Select worker
- Select new role
- Confirm reassignment (logs to role_change_log)

### 5.4 Local Database (LocalDB)
```javascript
// Session data (cleared on shift end)
db.shiftId
db.lineId
db.team[]
db.selectedStation
db.cycleCounts{}
db.lastTemps{}
db.mealBreakActive
db.mealBreakId
db.workerBreaks{}

// Cached server data (auto-synced)
db.stations[]
db.assignments[]
db.workers[]
db.defectTypes[]
db.downtimeTypes[]
db.breakTypes[]
db.recipes[]

// Offline queue
localStorage.eva_sync_queue = [
  { table_name, record_id, action, payload, created_at }
]
```

### 5.5 Offline & Sync
- **Service Worker** (`sw.js`): Caches static assets + API responses
- **Offline Detection**: Listens to `online`/`offline` events
- **Sync Queue**: All mutations recorded before sending
- **Batch Sync**: Kiosk POSTs `/api/sync/batch` with records when back online
- **Auto-retry**: Queued for 24h until successful

---

## 6. Database Performance Optimizations

### 6.1 SQLite Pragmas (in initDb)
```sql
PRAGMA journal_mode = WAL;           -- Write-Ahead Logging (concurrent reads)
PRAGMA foreign_keys = ON;             -- Enforce referential integrity
PRAGMA busy_timeout = 5000;            -- 5s wait before lock conflict
PRAGMA synchronous = NORMAL;           -- Balance safety/speed
PRAGMA cache_size = -64000;            -- 64MB in-memory cache
PRAGMA temp_store = MEMORY;            -- Temp tables in RAM
```

### 6.2 Indexes (Auto-Created)
- `stations(line_id)`
- `shifts(line_id, shift_date)`
- `shift_team_members(shift_id, worker_id)`
- `production_cycles(station_id, shift_id, shift_id)`
- `cycle_outputs(cycle_id)`
- `defect_logs(station_id, cycle_id)`
- `downtime_events(line_id, station_id)`
- `break_events(shift_id, worker_id)`
- `eva_mix_batches(line_id)`
- `material_transactions(material_id, type)`
- `sync_queue(synced_at)`
- `station_mold_assignments(station_id)`

### 6.3 Batch Operations
- Sync accepts up to 100 records per batch (configurable via `SYNC_BATCH_SIZE`)
- Transactions used for cycle creation (cycle + outputs atomically)
- Queries use prepared statements (parameterized) to prevent SQL injection

---

## 7. Deployment & Infrastructure

### 7.1 Docker Setup
```dockerfile
# Multistage builder
FROM node:20-alpine

WORKDIR /app
COPY server/package.json ./
RUN npm install --production

COPY server/src ./src
COPY server/.env.example ./.env
COPY kiosk ./public/kiosk
COPY admin ./public/admin

RUN mkdir -p /app/data /app/backups
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
```

### 7.2 Docker Compose
```yaml
services:
  eva-monitor:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: eva-monitor
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - db-data:/app/data           # SQLite + backups
      - backups:/app/backups
      - ./server/.env:/app/.env:ro  # Config (read-only)
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  db-data:
  backups:
```

### 7.3 Environment Variables
```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./data/eva-monitor.db

# Auth
JWT_SECRET=<change-to-random-secret>
JWT_EXPIRES_IN=24h

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<change-me>

# Sync
SYNC_BATCH_SIZE=100

# Backup
BACKUP_INTERVAL_HOURS=1
BACKUP_PATH=./backups
```

### 7.4 Caddy Reverse Proxy Config
```
{$DOMAIN:localhost} {
    reverse_proxy eva-monitor:3000
    
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
    }
    
    @static path *.css *.js *.html *.png *.jpg *.svg *.woff2
    header @static Cache-Control "public, max-age=3600"
    
    encode gzip zstd
}
```

---

## 8. Security Considerations

### 8.1 Authentication
- Admin uses JWT (24h expiration)
- Workers use PIN-based tokens (factory floor convenience)
- Tokens verified on protected endpoints
- Passwords hashed with bcryptjs

### 8.2 Authorization
- Admin routes check for JWT + admin role
- Kiosk routes check for JWT + worker role
- No role-based access control within kiosk (all workers can log all events)

### 8.3 Data Protection
- Database uses foreign keys (referential integrity)
- Soft deletes (is_active flags) for audit trail
- Sync queue records all mutations for traceability
- Role change log captures reassignments

### 8.4 Network Security (Caddy)
- TLS termination (if configured)
- Security headers (CSP, X-Frame-Options, etc.)
- Gzip + zstd compression

---

## 9. Key Business Logic

### 9.1 Production Cycle Recording
1. Worker enters station menu
2. Selects mold slots (A, B) with assigned recipes
3. Records cycle completion:
   - Cooking times (target vs actual)
   - Temperatures (4 gun stages + mold)
   - Output (good/bad pairs per mold)
4. Cycle auto-incremented per station/shift
5. Defects logged post-cycle

### 9.2 Shift Management
1. Worker enters PIN at kiosk
2. Selects role from 4 options (Operator, Helper, Trimmer, Packer)
3. Admin sees real-time team on station selector
4. On shift end: auto-counts roles, logs out all team members
5. Role changes audited in role_change_log

### 9.3 Material Tracking
- EVA materials have sizes (Small/Big) and colors
- Recipes define consumption per mold+material combo
- Mix batches pre-prepare materials in designated feeders
- Consumption logged with cycle_id for traceability
- Inventory updated on consume/replenish

### 9.4 KPI Calculations
- **Quality Rate**: (total_good_pairs / (total_good_pairs + total_bad_pairs)) × 100
- **Productive Hours**: shift_duration - meal_breaks - individual_breaks - downtime
- **Recipe Compliance**: cycles within tolerance of target cooking time
- **Pairs Per Hour**: total_good_pairs / productive_hours
- **Material Cost**: consumption_kg × cost_per_kg

### 9.5 Downtime Tracking
- Line-level (affects all stations)
- Station-level (affects one station)
- Planned (scheduled maintenance) vs Unplanned (equipment failure)
- Duration auto-calculated on end (or manual if ended late)

---

## 10. Extensibility & Future Enhancements

### 10.1 Possible Additions
- Multi-factory support (add `factory_id` to lines, shifts, etc.)
- Real-time websocket for live KPI dashboards
- ML-based quality prediction (defect forecasting)
- Mobile admin app (React Native)
- Integration with MES/ERP systems
- Predictive maintenance alerts
- Advanced role-based access control (RBAC)
- Data export to BI tools (Tableau, Power BI)

### 10.2 Performance Scaling
- For >10M cycles/year: partition production_cycles by date
- Archive old data to separate database
- Add Redis for session caching
- Use connection pooling for concurrent requests
- CDN for static assets (admin/kiosk JS/CSS)

### 10.3 Reliability
- Automated database backups (hourly)
- Replication to secondary DB (hot standby)
- Health checks on all endpoints
- Graceful shutdown handling (SIGTERM/SIGINT)
- Service worker ensures offline continuity

---

## 11. Deployment Checklist

- [ ] Set JWT_SECRET to random value (>32 chars)
- [ ] Set ADMIN_PASSWORD to strong password
- [ ] Configure TLS in Caddy config
- [ ] Test offline sync (disable network, make changes, reconnect)
- [ ] Verify healthcheck endpoint: `GET /api/health`
- [ ] Backup database daily to external storage
- [ ] Monitor Docker container logs for errors
- [ ] Set `NODE_ENV=production` in compose
- [ ] Seed initial data (lines, stations, workers, roles)
- [ ] Test kiosk PWA installation on tablets/factory displays

---

## 12. Troubleshooting

### Database Issues
- **"Database locked"**: Increase `busy_timeout` pragma
- **Performance degradation**: Check `PRAGMA query_plan` for slow queries, add indexes
- **Disk space**: Run `VACUUM` periodically; monitor `/app/data` volume

### Sync Issues
- **Offline queue grows**: Check kiosk network connectivity; verify `/api/sync/batch` endpoint
- **Stale data**: Clear localStorage and refresh kiosk
- **Conflicts**: Sync uses INSERT OR REPLACE (last-write-wins)

### Kiosk Issues
- **Service worker not updating**: Hard-refresh (Ctrl+Shift+R); bump version in sw.js
- **PIN not working**: Verify worker.pin in database (exact match)
- **Idle timeout too aggressive**: Adjust 300000ms (5 min) in app.js

### Admin Dashboard Issues
- **Login loop**: Clear localStorage; verify JWT_SECRET matches backend
- **Pages not loading**: Check browser console for JS errors; verify page module exports
- **Slow reports**: Add DB indexes; limit result set with date filters

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready
