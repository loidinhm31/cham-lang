use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
struct VersionMetadata {
    version: i64,
    last_updated: i64,
    device: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DriveFile {
    id: String,
    name: Option<String>,
    #[serde(rename = "modifiedTime")]
    modified_time: Option<String>,
    size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DriveFileList {
    files: Vec<DriveFile>,
}

const BACKUP_FILE_NAME: &str = "chamlang_backup.db";
const VERSION_FILE_NAME: &str = "chamlang_version.json";
const DRIVE_API_BASE: &str = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE: &str = "https://www.googleapis.com/upload/drive/v3";

/// Backup database to Google Drive
#[tauri::command]
pub async fn backup_to_gdrive(
    app: AppHandle,
    access_token: String,
) -> Result<String, String> {
    let db_path = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("chamlang.db");

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    // Read database file
    let db_content = std::fs::read(&db_path)
        .map_err(|e| format!("Failed to read database: {}", e))?;

    let client = reqwest::Client::new();

    // Check if backup file already exists
    let search_url = format!(
        "{}/files?q=name='{}' and trashed=false&fields=files(id)",
        DRIVE_API_BASE, BACKUP_FILE_NAME
    );

    let search_response = client
        .get(&search_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search files: {}", e))?;

    if !search_response.status().is_success() {
        let error_text = search_response.text().await.unwrap_or_default();
        return Err(format!("Search failed: {}", error_text));
    }

    let file_list: DriveFileList = search_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse search response: {}", e))?;

    let result = if let Some(existing_file) = file_list.files.first() {
        // Update existing file
        let update_url = format!(
            "{}/files/{}?uploadType=media",
            DRIVE_UPLOAD_BASE, existing_file.id
        );

        let response = client
            .patch(&update_url)
            .bearer_auth(&access_token)
            .header("Content-Type", "application/x-sqlite3")
            .body(db_content)
            .send()
            .await
            .map_err(|e| format!("Failed to update file: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Update failed: {}", error_text));
        }

        "Backup updated successfully!"
    } else {
        // Create new file
        let upload_url = format!(
            "{}/files?uploadType=multipart",
            DRIVE_UPLOAD_BASE
        );

        let metadata = serde_json::json!({
            "name": BACKUP_FILE_NAME,
            "mimeType": "application/x-sqlite3"
        });

        let boundary = "foo_bar_baz";
        let body = format!(
            "--{}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{}\r\n--{}\r\nContent-Type: application/x-sqlite3\r\n\r\n",
            boundary,
            serde_json::to_string(&metadata).unwrap(),
            boundary
        );

        let mut body_bytes = body.into_bytes();
        body_bytes.extend_from_slice(&db_content);
        body_bytes.extend_from_slice(format!("\r\n--{}--", boundary).as_bytes());

        let response = client
            .post(&upload_url)
            .bearer_auth(&access_token)
            .header(
                "Content-Type",
                format!("multipart/related; boundary={}", boundary),
            )
            .body(body_bytes)
            .send()
            .await
            .map_err(|e| format!("Failed to upload file: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Upload failed: {}", error_text));
        }

        "Backup created successfully!"
    };

    // Upload version metadata
    use crate::local_db::LocalDatabase;
    let db = app.state::<LocalDatabase>();
    let version = db.get_version().map_err(|e| format!("Failed to get version: {}", e))?;

    let version_metadata = VersionMetadata {
        version,
        last_updated: version,
        device: std::env::consts::OS.to_string(),
    };

    upload_version_metadata(&client, &access_token, &version_metadata).await?;

    Ok(result.to_string())
}

/// Helper function to upload version metadata
async fn upload_version_metadata(
    client: &reqwest::Client,
    access_token: &str,
    metadata: &VersionMetadata,
) -> Result<(), String> {
    let json_content = serde_json::to_string(&metadata)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;

    // Check if version file exists
    let search_url = format!(
        "{}/files?q=name='{}' and trashed=false&fields=files(id)",
        DRIVE_API_BASE, VERSION_FILE_NAME
    );

    let search_response = client
        .get(&search_url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search version file: {}", e))?;

    if !search_response.status().is_success() {
        return Err("Failed to search for version file".to_string());
    }

    let file_list: DriveFileList = search_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse search response: {}", e))?;

    if let Some(existing_file) = file_list.files.first() {
        // Update existing version file
        let update_url = format!(
            "{}/files/{}?uploadType=media",
            DRIVE_UPLOAD_BASE, existing_file.id
        );

        let response = client
            .patch(&update_url)
            .bearer_auth(access_token)
            .header("Content-Type", "application/json")
            .body(json_content)
            .send()
            .await
            .map_err(|e| format!("Failed to update version file: {}", e))?;

        if !response.status().is_success() {
            return Err("Failed to update version file".to_string());
        }
    } else {
        // Create new version file
        let upload_url = format!(
            "{}/files?uploadType=multipart",
            DRIVE_UPLOAD_BASE
        );

        let file_metadata = serde_json::json!({
            "name": VERSION_FILE_NAME,
            "mimeType": "application/json"
        });

        let boundary = "version_boundary";
        let body = format!(
            "--{}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{}\r\n--{}\r\nContent-Type: application/json\r\n\r\n{}\r\n--{}--",
            boundary,
            serde_json::to_string(&file_metadata).unwrap(),
            boundary,
            json_content,
            boundary
        );

        let response = client
            .post(&upload_url)
            .bearer_auth(access_token)
            .header(
                "Content-Type",
                format!("multipart/related; boundary={}", boundary),
            )
            .body(body)
            .send()
            .await
            .map_err(|e| format!("Failed to create version file: {}", e))?;

        if !response.status().is_success() {
            return Err("Failed to create version file".to_string());
        }
    }

    Ok(())
}

/// Restore database from Google Drive
#[tauri::command]
pub async fn restore_from_gdrive(
    app: AppHandle,
    access_token: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // Find the backup file
    let search_url = format!(
        "{}/files?q=name='{}' and trashed=false&fields=files(id,name,modifiedTime)",
        DRIVE_API_BASE, BACKUP_FILE_NAME
    );

    let search_response = client
        .get(&search_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search files: {}", e))?;

    if !search_response.status().is_success() {
        let error_text = search_response.text().await.unwrap_or_default();
        return Err(format!("Search failed: {}", error_text));
    }

    let file_list: DriveFileList = search_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse search response: {}", e))?;

    let backup_file = file_list
        .files
        .first()
        .ok_or_else(|| "No backup found on Google Drive".to_string())?;

    // Download the file
    let download_url = format!(
        "{}/files/{}?alt=media",
        DRIVE_API_BASE, backup_file.id
    );

    let download_response = client
        .get(&download_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;

    if !download_response.status().is_success() {
        let error_text = download_response.text().await.unwrap_or_default();
        return Err(format!("Download failed: {}", error_text));
    }

    let db_content = download_response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read downloaded content: {}", e))?;

    // Write to database file
    let db_path = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("chamlang.db");

    std::fs::write(&db_path, db_content)
        .map_err(|e| format!("Failed to write database: {}", e))?;

    Ok("Database restored successfully!".to_string())
}

/// Clear local database completely
#[tauri::command]
pub fn clear_local_database(app: AppHandle) -> Result<String, String> {
    use tauri::Manager;
    use crate::local_db::LocalDatabase;

    // Get the database from app state
    let db = app.state::<LocalDatabase>();

    // Clear the database by dropping all tables and reinitializing
    db.clear_all_data()
        .map_err(|e| format!("Failed to clear database: {}", e))?;

    Ok("Database cleared successfully! All data has been removed.".to_string())
}

/// Check if remote version is different from local version
#[tauri::command]
pub async fn check_version_difference(
    app: AppHandle,
    access_token: String,
) -> Result<bool, String> {
    use crate::local_db::LocalDatabase;

    let client = reqwest::Client::new();

    // Get remote version
    let search_url = format!(
        "{}/files?q=name='{}' and trashed=false&fields=files(id)",
        DRIVE_API_BASE, VERSION_FILE_NAME
    );

    let search_response = client
        .get(&search_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search version file: {}", e))?;

    if !search_response.status().is_success() {
        // No version file means no backup yet
        return Ok(false);
    }

    let file_list: DriveFileList = search_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse search response: {}", e))?;

    let version_file = file_list.files.first();
    if version_file.is_none() {
        // No version file means no backup yet
        return Ok(false);
    }

    // Download version file
    let download_url = format!(
        "{}/files/{}?alt=media",
        DRIVE_API_BASE, version_file.unwrap().id
    );

    let download_response = client
        .get(&download_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to download version file: {}", e))?;

    if !download_response.status().is_success() {
        return Ok(false);
    }

    let remote_metadata: VersionMetadata = download_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse version metadata: {}", e))?;

    // Get local version
    let db = app.state::<LocalDatabase>();
    let local_version = db.get_version().map_err(|e| format!("Failed to get local version: {}", e))?;

    // Return true if versions are different
    Ok(remote_metadata.version != local_version)
}

/// Get information about the backup on Google Drive
#[tauri::command]
pub async fn get_gdrive_backup_info(
    access_token: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let search_url = format!(
        "{}/files?q=name='{}' and trashed=false&fields=files(id,name,modifiedTime,size)",
        DRIVE_API_BASE, BACKUP_FILE_NAME
    );

    let response = client
        .get(&search_url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search files: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Search failed: {}", error_text));
    }

    let file_list: DriveFileList = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(file) = file_list.files.first() {
        let size_kb = file.size.as_ref()
            .and_then(|s| s.parse::<u64>().ok())
            .map(|s| s / 1024)
            .unwrap_or(0);

        let info = format!(
            "File: {}\nLast modified: {}\nSize: {} KB",
            file.name.as_ref().unwrap_or(&BACKUP_FILE_NAME.to_string()),
            file.modified_time.as_ref().unwrap_or(&"Unknown".to_string()),
            size_kb
        );
        Ok(info)
    } else {
        Err("No backup found".to_string())
    }
}
