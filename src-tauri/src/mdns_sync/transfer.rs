/// Database file transfer utilities

use std::path::Path;
use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::Read;

/// Calculate SHA256 checksum of a file
pub fn calculate_checksum(path: &Path) -> Result<String, String> {
    let mut file = File::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = vec![0; 1024 * 1024]; // 1 MB buffer

    loop {
        let n = file.read(&mut buffer)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(hex::encode(hasher.finalize()))
}

/// Create a backup of the database
pub fn create_backup(db_path: &Path) -> Result<std::path::PathBuf, String> {
    let backup_path = db_path.with_extension("backup.db");
    std::fs::copy(db_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    Ok(backup_path)
}

/// Restore database from backup
pub fn restore_backup(backup_path: &Path, db_path: &Path) -> Result<(), String> {
    std::fs::copy(backup_path, db_path)
        .map_err(|e| format!("Failed to restore backup: {}", e))?;
    std::fs::remove_file(backup_path)
        .map_err(|e| format!("Failed to remove backup: {}", e))?;
    Ok(())
}
