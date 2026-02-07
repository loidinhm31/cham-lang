use chrono::Utc;
use rusqlite::{params, Result as SqlResult};
use uuid::Uuid;

use super::helpers::timestamp_to_datetime;
use super::LocalDatabase;
use crate::models::Collection;

impl LocalDatabase {
    /// Create a new collection
    pub fn create_collection(
        &self,
        name: &str,
        description: &str,
        language: &str,
        is_public: bool,
    ) -> SqlResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO collections
             (id, name, description, language, is_public, word_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)",
            params![id, name, description, language, is_public, now, now],
        )?;

        Ok(id)
    }

    /// Import a collection with a specific ID (used for sync/restore operations)
    pub fn import_collection_with_id(
        &self,
        collection_id: &str,
        name: &str,
        description: &str,
        language: &str,
        shared_by: Option<&str>,
        is_public: bool,
    ) -> SqlResult<()> {
        let now = Utc::now().timestamp();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO collections
             (id, name, description, language, shared_by, is_public, word_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
            params![collection_id, name, description, language, shared_by, is_public, now, now],
        )?;

        Ok(())
    }

    /// Get a collection by ID (normalized version)
    pub fn get_collection(&self, collection_id: &str) -> SqlResult<Option<Collection>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, language, shared_by, is_public,
                    word_count, created_at, updated_at, sync_version, synced_at
             FROM collections WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![collection_id])?;

        if let Some(row) = rows.next()? {
            // Extract all values before dropping rows/stmt
            let collection_id_local: String = row.get(0)?;
            let name: String = row.get(1)?;
            let description: Option<String> = row.get(2)?;
            let language: String = row.get(3)?;
            let shared_by: Option<String> = row.get(4)?;
            let is_public: i32 = row.get::<_, Option<i32>>(5)?.unwrap_or(0);
            let word_count: i32 = row.get::<_, Option<i32>>(6)?.unwrap_or(0);
            let created_at = timestamp_to_datetime(row.get(7)?);
            let updated_at = timestamp_to_datetime(row.get(8)?);
            let sync_version: i64 = row.get::<_, Option<i64>>(9)?.unwrap_or(1);
            let synced_at: Option<i64> = row.get(10)?;

            drop(rows);
            drop(stmt);

            // Fetch shared users with permissions from normalized table
            let mut shared_stmt = conn
                .prepare("SELECT user_id, permission FROM collection_shared_users WHERE collection_id = ?1 AND deleted = 0")?;
            let shared_with: Vec<crate::models::SharedUser> = shared_stmt
                .query_map(params![&collection_id_local], |r| {
                    Ok(crate::models::SharedUser {
                        user_id: r.get(0)?,
                        permission: r.get::<_, String>(1).unwrap_or_else(|_| "viewer".to_string()),
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(Some(Collection {
                id: collection_id_local,
                name,
                description: description.unwrap_or_default(),
                language,
                shared_by,
                shared_with,
                is_public: is_public != 0,
                word_count,
                created_at,
                updated_at,
                sync_version,
                synced_at,
            }))
        } else {
            Ok(None)
        }
    }

    /// Get all collections (owned + shared, all non-deleted)
    pub fn get_user_collections(&self) -> SqlResult<Vec<Collection>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, language, shared_by, is_public,
                    word_count, created_at, updated_at, sync_version, synced_at
             FROM collections
             WHERE deleted = 0
             ORDER BY updated_at DESC, name COLLATE NOCASE ASC",
        )?;

        let collection_rows: Vec<_> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,                   // id
                    row.get::<_, String>(1)?,                   // name
                    row.get::<_, Option<String>>(2)?,           // description
                    row.get::<_, String>(3)?,                   // language
                    row.get::<_, Option<String>>(4)?,           // shared_by
                    row.get::<_, Option<i32>>(5)?.unwrap_or(0), // is_public
                    row.get::<_, Option<i32>>(6)?.unwrap_or(0), // word_count
                    row.get::<_, i64>(7)?,                      // created_at
                    row.get::<_, i64>(8)?,                      // updated_at
                    row.get::<_, Option<i64>>(9)?.unwrap_or(1), // sync_version
                    row.get::<_, Option<i64>>(10)?,             // synced_at
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        drop(stmt);

        // Fetch shared users for each collection
        let mut collections = Vec::new();
        for (
            id,
            name,
            description,
            language,
            shared_by,
            is_public,
            word_count,
            created_at,
            updated_at,
            sync_version,
            synced_at,
        ) in collection_rows
        {
            let mut shared_stmt = conn
                .prepare("SELECT user_id, permission FROM collection_shared_users WHERE collection_id = ?1 AND deleted = 0")?;
            let shared_with: Vec<crate::models::SharedUser> = shared_stmt
                .query_map(params![&id], |r| {
                    Ok(crate::models::SharedUser {
                        user_id: r.get(0)?,
                        permission: r.get::<_, String>(1).unwrap_or_else(|_| "viewer".to_string()),
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            collections.push(Collection {
                id,
                name,
                description: description.unwrap_or_default(),
                language,
                shared_by,
                shared_with,
                is_public: is_public != 0,
                word_count,
                created_at: timestamp_to_datetime(created_at),
                updated_at: timestamp_to_datetime(updated_at),
                sync_version,
                synced_at,
            });
        }

        Ok(collections)
    }

    /// Get all public collections (optionally filtered by language)
    pub fn get_public_collections(&self, language: Option<&str>) -> SqlResult<Vec<Collection>> {
        let conn = self.conn.lock().unwrap();

        let sql = if language.is_some() {
            "SELECT id, name, description, language, shared_by, is_public,
                    word_count, created_at, updated_at, sync_version, synced_at
             FROM collections
             WHERE is_public = 1 AND language = ?1 AND deleted = 0
             ORDER BY updated_at DESC, name COLLATE NOCASE ASC"
        } else {
            "SELECT id, name, description, language, shared_by, is_public,
                    word_count, created_at, updated_at, sync_version, synced_at
             FROM collections
             WHERE is_public = 1 AND deleted = 0
             ORDER BY updated_at DESC, name COLLATE NOCASE ASC"
        };

        let mut stmt = conn.prepare(sql)?;

        let map_row = |row: &rusqlite::Row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<i32>>(5)?.unwrap_or(0),
                row.get::<_, Option<i32>>(6)?.unwrap_or(0),
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
                row.get::<_, Option<i64>>(9)?.unwrap_or(1),
                row.get::<_, Option<i64>>(10)?,
            ))
        };

        let collection_rows: Vec<_> = if let Some(lang) = language {
            stmt.query_map(params![lang], map_row)?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([], map_row)?
                .collect::<Result<Vec<_>, _>>()?
        };

        drop(stmt);

        // Fetch shared users for each collection
        let mut collections = Vec::new();
        for (
            id,
            name,
            description,
            language,
            shared_by,
            is_public,
            word_count,
            created_at,
            updated_at,
            sync_version,
            synced_at,
        ) in collection_rows
        {
            let mut shared_stmt = conn
                .prepare("SELECT user_id, permission FROM collection_shared_users WHERE collection_id = ?1 AND deleted = 0")?;
            let shared_with: Vec<crate::models::SharedUser> = shared_stmt
                .query_map(params![&id], |r| {
                    Ok(crate::models::SharedUser {
                        user_id: r.get(0)?,
                        permission: r.get::<_, String>(1).unwrap_or_else(|_| "viewer".to_string()),
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            collections.push(Collection {
                id,
                name,
                description: description.unwrap_or_default(),
                language,
                shared_by,
                shared_with,
                is_public: is_public != 0,
                word_count,
                created_at: timestamp_to_datetime(created_at),
                updated_at: timestamp_to_datetime(updated_at),
                sync_version,
                synced_at,
            });
        }

        Ok(collections)
    }

    /// Update collection word count based on vocabularies
    pub fn update_collection_word_count(&self, collection_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        // Count vocabularies in this collection
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM vocabularies WHERE collection_id = ?1 AND deleted = 0",
            params![collection_id],
            |row| row.get(0),
        )?;

        let now = Utc::now().timestamp();
        conn.execute(
            "UPDATE collections SET word_count = ?1, updated_at = ?2
             WHERE id = ?3",
            params![count, now, collection_id],
        )?;

        Ok(())
    }

    /// Update collection metadata
    pub fn update_collection(
        &self,
        collection_id: &str,
        name: &str,
        description: &str,
        is_public: bool,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        conn.execute(
            "UPDATE collections SET name = ?1, description = ?2, is_public = ?3, updated_at = ?4
             WHERE id = ?5",
            params![name, description, is_public, now, collection_id],
        )?;

        Ok(())
    }

    /// Delete a collection (soft-delete for sync)
    pub fn delete_collection(&self, collection_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Soft-delete all vocabularies in this collection
        conn.execute(
            "UPDATE vocabularies SET deleted = 1, deleted_at = ?1, synced_at = NULL
             WHERE collection_id = ?2 AND deleted = 0",
            params![now, collection_id],
        )?;

        // Soft-delete the collection itself
        conn.execute(
            "UPDATE collections SET deleted = 1, deleted_at = ?1, synced_at = NULL
             WHERE id = ?2",
            params![now, collection_id],
        )?;

        Ok(())
    }

    /// Share a collection with a user (normalized version)
    pub fn share_collection(&self, collection_id: &str, user_id: &str, permission: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        // Insert into collection_shared_users (UNIQUE constraint prevents duplicates)
        conn.execute(
            "INSERT OR IGNORE INTO collection_shared_users
             (id, collection_id, user_id, permission, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, collection_id, user_id, permission, now],
        )?;

        // Update collection updated_at timestamp
        conn.execute(
            "UPDATE collections SET updated_at = ?1 WHERE id = ?2",
            params![now, collection_id],
        )?;

        Ok(())
    }

    /// Unshare a collection from a user (normalized version)
    pub fn unshare_collection(&self, collection_id: &str, user_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Delete from collection_shared_users
        conn.execute(
            "DELETE FROM collection_shared_users
             WHERE collection_id = ?1 AND user_id = ?2",
            params![collection_id, user_id],
        )?;

        // Update collection updated_at timestamp
        conn.execute(
            "UPDATE collections SET updated_at = ?1 WHERE id = ?2",
            params![now, collection_id],
        )?;

        Ok(())
    }
}
