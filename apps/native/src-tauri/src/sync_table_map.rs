/// Mapping between camelCase sync protocol table names and snake_case local DB table names.

const TABLE_MAP: &[(&str, &str)] = &[
    ("wordProgress", "word_progress"),
    ("learningSettings", "learning_settings"),
    ("practiceSessions", "practice_sessions"),
    ("practiceProgress", "practice_progress"),
    ("userLearningLanguages", "user_learning_languages"),
    ("collectionSharedUsers", "collection_shared_users"),
];

/// Convert a sync protocol table name (camelCase) to a local DB table name (snake_case).
/// Tables that are already the same in both (e.g. "collections") are returned as-is.
pub fn sync_to_db(sync_name: &str) -> &str {
    TABLE_MAP
        .iter()
        .find(|(s, _)| *s == sync_name)
        .map(|(_, d)| *d)
        .unwrap_or(sync_name)
}

/// Convert a local DB table name (snake_case) to a sync protocol table name (camelCase).
/// Tables that are already the same in both (e.g. "collections") are returned as-is.
pub fn db_to_sync(db_name: &str) -> &str {
    TABLE_MAP
        .iter()
        .find(|(_, d)| *d == db_name)
        .map(|(s, _)| *s)
        .unwrap_or(db_name)
}
