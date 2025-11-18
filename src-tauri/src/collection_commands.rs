use tauri::State;
use mongodb::bson::{doc, to_document};
use chrono::Utc;
use futures::stream::TryStreamExt;

use crate::database::{DatabaseManager, parse_object_id};
use crate::models::{Collection, CreateCollectionRequest, UpdateCollectionRequest};

// Collection CRUD Commands

#[tauri::command]
pub async fn create_collection(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
    request: CreateCollectionRequest,
) -> Result<String, String> {
    let collection = db_manager.get_collections_collection().await?;

    let now = Utc::now();
    let new_collection = Collection {
        id: None,
        name: request.name,
        description: request.description,
        language: request.language,
        owner_id: user_id,
        shared_with: vec![],
        is_public: request.is_public,
        word_count: 0,
        created_at: now,
        updated_at: now,
    };

    let result = collection
        .insert_one(&new_collection)
        .await
        .map_err(|e| format!("Failed to create collection: {}", e))?;

    Ok(result.inserted_id.as_object_id().unwrap().to_hex())
}

#[tauri::command]
pub async fn get_collection(
    db_manager: State<'_, DatabaseManager>,
    id: String,
) -> Result<Collection, String> {
    let collection = db_manager.get_collections_collection().await?;
    let object_id = parse_object_id(&id)?;

    let result = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to get collection: {}", e))?
        .ok_or_else(|| "Collection not found".to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn get_user_collections(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
) -> Result<Vec<Collection>, String> {
    let collection = db_manager.get_collections_collection().await?;

    // Get collections owned by user or shared with user
    let filter = doc! {
        "$or": [
            {"owner_id": &user_id},
            {"shared_with": &user_id}
        ]
    };

    let mut cursor = collection
        .find(filter)
        .sort(doc! {"created_at": -1})
        .await
        .map_err(|e| format!("Failed to get collections: {}", e))?;

    let mut collections = Vec::new();
    while let Some(coll) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate collections: {}", e))?
    {
        collections.push(coll);
    }

    Ok(collections)
}

#[tauri::command]
pub async fn get_public_collections(
    db_manager: State<'_, DatabaseManager>,
    language: Option<String>,
) -> Result<Vec<Collection>, String> {
    let collection = db_manager.get_collections_collection().await?;

    let mut filter = doc! {"is_public": true};
    if let Some(lang) = language {
        filter.insert("language", lang);
    }

    let mut cursor = collection
        .find(filter)
        .sort(doc! {"word_count": -1})
        .limit(50)
        .await
        .map_err(|e| format!("Failed to get public collections: {}", e))?;

    let mut collections = Vec::new();
    while let Some(coll) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate collections: {}", e))?
    {
        collections.push(coll);
    }

    Ok(collections)
}

#[tauri::command]
pub async fn update_collection(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
    request: UpdateCollectionRequest,
) -> Result<String, String> {
    let collection = db_manager.get_collections_collection().await?;
    let object_id = parse_object_id(&request.id)?;

    // Check ownership
    let existing = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to find collection: {}", e))?
        .ok_or_else(|| "Collection not found".to_string())?;

    if existing.owner_id != user_id {
        return Err("You don't have permission to update this collection".to_string());
    }

    let mut update_doc = doc! {
        "$set": {
            "updated_at": mongodb::bson::to_bson(&Utc::now()).unwrap()
        }
    };

    let set_doc = update_doc.get_document_mut("$set").unwrap();

    if let Some(name) = request.name {
        set_doc.insert("name", name);
    }
    if let Some(description) = request.description {
        set_doc.insert("description", description);
    }
    if let Some(is_public) = request.is_public {
        set_doc.insert("is_public", is_public);
    }
    if let Some(shared_with) = request.shared_with {
        set_doc.insert("shared_with", shared_with);
    }

    collection
        .update_one(doc! {"_id": object_id}, update_doc)
        .await
        .map_err(|e| format!("Failed to update collection: {}", e))?;

    Ok("Collection updated successfully".to_string())
}

#[tauri::command]
pub async fn delete_collection(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
    id: String,
) -> Result<String, String> {
    let collection = db_manager.get_collections_collection().await?;
    let object_id = parse_object_id(&id)?;

    // Check ownership
    let existing = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to find collection: {}", e))?
        .ok_or_else(|| "Collection not found".to_string())?;

    if existing.owner_id != user_id {
        return Err("You don't have permission to delete this collection".to_string());
    }

    // Delete collection
    collection
        .delete_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to delete collection: {}", e))?;

    // TODO: Optionally delete all vocabularies in this collection
    // For now, we'll leave them orphaned

    Ok("Collection deleted successfully".to_string())
}

#[tauri::command]
pub async fn share_collection(
    db_manager: State<'_, DatabaseManager>,
    owner_id: String,
    collection_id: String,
    share_with_username: String,
) -> Result<String, String> {
    let collections_coll = db_manager.get_collections_collection().await?;
    let users_coll = db_manager.get_users_collection().await?;
    let object_id = parse_object_id(&collection_id)?;

    // Check ownership
    let existing = collections_coll
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to find collection: {}", e))?
        .ok_or_else(|| "Collection not found".to_string())?;

    if existing.owner_id != owner_id {
        return Err("You don't have permission to share this collection".to_string());
    }

    // Find user to share with
    let share_user = users_coll
        .find_one(doc! {"username": &share_with_username})
        .await
        .map_err(|e| format!("Failed to find user: {}", e))?
        .ok_or_else(|| "User not found".to_string())?;

    let share_user_id = share_user.id.unwrap().to_hex();

    // Add to shared_with list
    collections_coll
        .update_one(
            doc! {"_id": object_id},
            doc! {
                "$addToSet": {"shared_with": &share_user_id},
                "$set": {"updated_at": mongodb::bson::to_bson(&Utc::now()).unwrap()}
            },
        )
        .await
        .map_err(|e| format!("Failed to share collection: {}", e))?;

    Ok(format!("Collection shared with {}", share_with_username))
}

#[tauri::command]
pub async fn unshare_collection(
    db_manager: State<'_, DatabaseManager>,
    owner_id: String,
    collection_id: String,
    user_id_to_remove: String,
) -> Result<String, String> {
    let collection = db_manager.get_collections_collection().await?;
    let object_id = parse_object_id(&collection_id)?;

    // Check ownership
    let existing = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to find collection: {}", e))?
        .ok_or_else(|| "Collection not found".to_string())?;

    if existing.owner_id != owner_id {
        return Err("You don't have permission to unshare this collection".to_string());
    }

    // Remove from shared_with list
    collection
        .update_one(
            doc! {"_id": object_id},
            doc! {
                "$pull": {"shared_with": &user_id_to_remove},
                "$set": {"updated_at": mongodb::bson::to_bson(&Utc::now()).unwrap()}
            },
        )
        .await
        .map_err(|e| format!("Failed to unshare collection: {}", e))?;

    Ok("User removed from collection".to_string())
}

#[tauri::command]
pub async fn update_collection_word_count(
    db_manager: State<'_, DatabaseManager>,
    collection_id: String,
) -> Result<(), String> {
    let collections_coll = db_manager.get_collections_collection().await?;
    let vocab_coll = db_manager.get_vocabulary_collection().await?;
    let object_id = parse_object_id(&collection_id)?;

    // Count words in collection
    let count = vocab_coll
        .count_documents(doc! {"collection_id": &collection_id})
        .await
        .map_err(|e| format!("Failed to count words: {}", e))?;

    // Update collection
    collections_coll
        .update_one(
            doc! {"_id": object_id},
            doc! {"$set": {"word_count": count as i32}},
        )
        .await
        .map_err(|e| format!("Failed to update word count: {}", e))?;

    Ok(())
}
