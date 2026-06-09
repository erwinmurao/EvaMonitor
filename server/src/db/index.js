const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let sqlJsDb = null;
let dbFilePath = null;
let saveTimer = null;

// Convert sql.js query result [{columns, values}] to array of objects
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i];
    }
    return obj;
  });
}

// Wrapper that mimics better-sqlite3 API using sql.js
class DatabaseWrapper {
  constructor(rawDb, filePath) {
    this._db = rawDb;
    this._filePath = filePath;
  }

  prepare(sql) {
    const rawDb = this._db;
    const filePath = this._filePath;
    return {
      all(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        try {
          const results = rawDb.exec(sql, params);
          return rowsToObjects(results);
        } catch (e) {
          // Empty result set
          if (e.message && e.message.includes('no tables')) return [];
          throw e;
        }
      },
      get(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        try {
          const results = rawDb.exec(sql, params);
          const rows = rowsToObjects(results);
          return rows.length > 0 ? rows[0] : undefined;
        } catch (e) {
          if (e.message && e.message.includes('no tables')) return undefined;
          throw e;
        }
      },
      run(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        rawDb.run(sql, params);
        const lidResult = rawDb.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = lidResult.length > 0 ? lidResult[0].values[0][0] : 0;
        const changes = rawDb.getRowsModified();
        scheduleSave(rawDb, filePath);
        return { lastInsertRowid, changes };
      }
    };
  }

  exec(sql) {
    this._db.exec(sql);
    scheduleSave(this._db, this._filePath);
  }

  pragma(statement) {
    try { this._db.exec(`PRAGMA ${statement}`); } catch (e) { /* ignore */ }
  }

  transaction(fn) {
    const rawDb = this._db;
    const filePath = this._filePath;
    return () => {
      rawDb.exec('BEGIN TRANSACTION');
      try {
        const result = fn();
        rawDb.exec('COMMIT');
        scheduleSave(rawDb, filePath);
        return result;
      } catch (e) {
        rawDb.exec('ROLLBACK');
        throw e;
      }
    };
  }

  close() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    this.save();
    this._db.close();
  }

  save() {
    if (this._filePath) {
      const data = this._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this._filePath, buffer);
    }
  }
}

// Debounced save to disk (500ms after last write)
function scheduleSave(rawDb, filePath) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = rawDb.export();
      fs.writeFileSync(filePath, Buffer.from(data));
    } catch (e) {
      console.error('[DB] Save error:', e.message);
    }
  }, 500);
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

async function initDb(dbPathArg) {
  dbFilePath = dbPathArg;
  const dir = path.dirname(dbPathArg);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(dbPathArg)) {
    const fileBuffer = fs.readFileSync(dbPathArg);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  db = new DatabaseWrapper(sqlJsDb, dbFilePath);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
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

  // Initial save
  db.save();

  console.log(`[DB] Initialized at ${dbPathArg}`);
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    sqlJsDb = null;
    console.log('[DB] Closed');
  }
}

function queueSync(tableName, recordId, action, payload) {
  const d = getDb();
  d.prepare(
    `INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES (?, ?, ?, ?)`
  ).run(tableName, recordId, action, payload ? JSON.stringify(payload) : '{}');
}

function getSetting(key) {
  const d = getDb();
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

module.exports = { getDb, initDb, closeDb, queueSync, getSetting, setSetting };
