#!/bin/sh
# Hourly SQLite backup script
# Add to crontab: 0 * * * * /app/backups/backup.sh

DB_PATH="${DB_PATH:-/app/data/eva-monitor.db}"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/eva-monitor_${TIMESTAMP}.db"

# Use sqlite3 backup API via better-sqlite3's built-in backup
# For simplicity, we copy the WAL-enabled DB
cp "$DB_PATH" "$BACKUP_FILE" 2>/dev/null
cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal" 2>/dev/null
cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm" 2>/dev/null

# Compress
gzip -f "$BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "eva-monitor_*.db.gz" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backup completed: ${BACKUP_FILE}.gz"
