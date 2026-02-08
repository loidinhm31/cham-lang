use tauri::State;

use crate::local_db::LocalDatabase;
use crate::models::{Collection, CreateCollectionRequest, UpdateCollectionRequest};

// Collection CRUD Commands

#[tauri::command]
pub fn create_collection(
    local_db: State<'_, LocalDatabase>,
    request: CreateCollectionRequest,
) -> Result<String, String> {
    let collection_id = local_db
        .create_collection(
            &request.name,
            &request.description,
            &request.language,
            request.is_public,
        )
        .map_err(|e| format!("Failed to create collection: {}", e))?;

    println!("✓ Collection created: {} ({})", request.name, collection_id);
    Ok(collection_id)
}

#[tauri::command]
pub fn get_collection(
    local_db: State<'_, LocalDatabase>,
    id: String,
) -> Result<Collection, String> {
    local_db
        .get_collection(&id)
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| "Collection not found".to_string())
}

#[tauri::command]
pub fn get_user_collections(
    local_db: State<'_, LocalDatabase>,
) -> Result<Vec<Collection>, String> {
    local_db
        .get_user_collections()
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub fn get_public_collections(
    local_db: State<'_, LocalDatabase>,
    language: Option<String>,
) -> Result<Vec<Collection>, String> {
    local_db
        .get_public_collections(language.as_deref())
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub fn update_collection(
    local_db: State<'_, LocalDatabase>,
    request: UpdateCollectionRequest,
) -> Result<String, String> {
    let name = request.name.unwrap_or_default();
    let description = request.description.unwrap_or_default();
    let is_public = request.is_public.unwrap_or(false);

    local_db
        .update_collection(
            &request.id,
            &name,
            &description,
            is_public,
        )
        .map_err(|e| format!("Database error: {}", e))?;

    println!("✓ Collection updated: {} ({})", name, request.id);
    Ok("Collection updated successfully".to_string())
}

#[tauri::command]
pub fn delete_collection(
    local_db: State<'_, LocalDatabase>,
    id: String,
) -> Result<String, String> {
    local_db
        .delete_collection(&id)
        .map_err(|e| format!("Database error: {}", e))?;

    println!("✓ Collection deleted: {}", id);
    Ok("Collection deleted successfully".to_string())
}

#[tauri::command]
pub fn share_collection(
    local_db: State<'_, LocalDatabase>,
    collection_id: String,
    user_id: String,
    permission: Option<String>,
) -> Result<String, String> {
    let permission = permission.as_deref().unwrap_or("viewer");
    local_db
        .share_collection(&collection_id, &user_id, permission)
        .map_err(|e| format!("Database error: {}", e))?;

    println!("✓ Collection shared: {} with user {} ({})", collection_id, user_id, permission);
    Ok("Collection shared successfully".to_string())
}

#[tauri::command]
pub fn unshare_collection(
    local_db: State<'_, LocalDatabase>,
    collection_id: String,
    user_id: String,
) -> Result<String, String> {
    local_db
        .unshare_collection(&collection_id, &user_id)
        .map_err(|e| format!("Database error: {}", e))?;

    println!("✓ Collection unshared: {} from user {}", collection_id, user_id);
    Ok("Collection unshared successfully".to_string())
}

