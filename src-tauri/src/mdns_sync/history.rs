/// Sync history tracking

use std::sync::Arc;
use chrono::Utc;
use rusqlite::params;
use crate::local_db::LocalDatabase;
use crate::models::SyncHistoryEntry;

pub struct SyncHistoryTracker {
    db: Arc<LocalDatabase>,
}

impl SyncHistoryTracker {
    pub fn new(db: Arc<LocalDatabase>) -> Self {
        Self { db }
    }

    /// Record a sync operation
    pub fn record_sync(
        &self,
        device_id: &str,
        direction: &str,
        bytes_transferred: i64,
        duration_ms: i64,
        status: &str,
        error_message: Option<&str>,
        local_version_before: i64,
        local_version_after: i64,
    ) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let synced_at = Utc::now().timestamp();

        let conn = self.db.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO sync_history (id, device_id, direction, bytes_transferred, duration_ms, status, error_message, local_version_before, local_version_after, synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![id, device_id, direction, bytes_transferred, duration_ms, status, error_message, local_version_before, local_version_after, synced_at],
        ).map_err(|e| format!("Failed to record sync: {}", e))?;

        Ok(id)
    }

    /// Get sync history for a device
    pub fn get_sync_history(&self, device_id: Option<&str>, limit: Option<i64>) -> Result<Vec<SyncHistoryEntry>, String> {
        let conn = self.db.conn.lock().unwrap();

        let query = "SELECT h.id, h.device_id, t.device_name, h.direction, h.bytes_transferred, h.duration_ms, h.status, h.error_message, h.local_version_before, h.local_version_after, h.synced_at
             FROM sync_history h
             LEFT JOIN trusted_devices t ON h.device_id = t.device_id
             WHERE (?1 IS NULL OR h.device_id = ?1)
             ORDER BY h.synced_at DESC
             LIMIT ?2";

        let mut stmt = conn.prepare(query)
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let entries = stmt.query_map(params![device_id, limit.unwrap_or(50)], |row| {
            Ok(SyncHistoryEntry {
                id: row.get(0)?,
                device_id: row.get(1)?,
                device_name: row.get(2)?,
                direction: row.get(3)?,
                bytes_transferred: row.get(4)?,
                duration_ms: row.get(5)?,
                status: row.get(6)?,
                error_message: row.get(7)?,
                local_version_before: row.get(8)?,
                local_version_after: row.get(9)?,
                synced_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Failed to query history: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect history: {}", e))?;

        Ok(entries)
    }
}
