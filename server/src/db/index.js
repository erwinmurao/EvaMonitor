const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Performance optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');

  // Apply schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // Check if seed data needed
  const row = db.prepare('SELECT COUNT(*) as count FROM lines').get();
  if (row.count === 0) {
    const seedPath = path.join(__dirname, 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    db.exec(seed);
    console.log('[DB] Seed data applied');
  }

  console.log(`[DB] Initialized at ${dbPath}`);
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Closed');
  }
}

// Helper: generate a new ID for sync_queue tracking
function queueSync(tableName, recordId, action, payload) {
  const d = getDb();
  d.prepare(
    `INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES (?, ?, ?, ?)`
  ).run(tableName, recordId, action, payload ? JSON.stringify(payload) : '{}');
}

// Helper: get setting value
function getSetting(key) {
  const d = getDb();
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

// Helper: set setting value
function setSetting(key, value) {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

module.exports = { getDb, initDb, closeDb, queueSync, getSetting, setSetting };
