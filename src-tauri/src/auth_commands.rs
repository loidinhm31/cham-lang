use tauri::State;
use mongodb::bson::{doc, to_document};
use chrono::Utc;
use bcrypt::{hash, verify, DEFAULT_COST};

use crate::database::DatabaseManager;
use crate::models::{User, RegisterRequest, LoginRequest, UserSession};

// Authentication Commands

#[tauri::command]
pub async fn register_user(
    db_manager: State<'_, DatabaseManager>,
    request: RegisterRequest,
) -> Result<UserSession, String> {
    let collection = db_manager.get_users_collection().await?;

    // Check if username already exists
    let existing_user = collection
        .find_one(doc! {"username": &request.username})
        .await
        .map_err(|e| format!("Failed to check username: {}", e))?;

    if existing_user.is_some() {
        return Err("Username already exists".to_string());
    }

    // Check if email already exists
    let existing_email = collection
        .find_one(doc! {"email": &request.email})
        .await
        .map_err(|e| format!("Failed to check email: {}", e))?;

    if existing_email.is_some() {
        return Err("Email already exists".to_string());
    }

    // Hash password
    let password_hash = hash(&request.password, DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    let now = Utc::now();
    let user = User {
        id: None,
        username: request.username.clone(),
        email: request.email.clone(),
        password_hash,
        created_at: now,
        updated_at: now,
    };

    let result = collection
        .insert_one(&user)
        .await
        .map_err(|e| format!("Failed to create user: {}", e))?;

    let user_id = result.inserted_id.as_object_id().unwrap().to_hex();

    Ok(UserSession {
        user_id,
        username: request.username,
        email: request.email,
    })
}

#[tauri::command]
pub async fn login_user(
    db_manager: State<'_, DatabaseManager>,
    request: LoginRequest,
) -> Result<UserSession, String> {
    let collection = db_manager.get_users_collection().await?;

    // Find user by username
    let user = collection
        .find_one(doc! {"username": &request.username})
        .await
        .map_err(|e| format!("Failed to find user: {}", e))?
        .ok_or_else(|| "Invalid username or password".to_string())?;

    // Verify password
    let valid = verify(&request.password, &user.password_hash)
        .map_err(|e| format!("Failed to verify password: {}", e))?;

    if !valid {
        return Err("Invalid username or password".to_string());
    }

    Ok(UserSession {
        user_id: user.id.unwrap().to_hex(),
        username: user.username,
        email: user.email,
    })
}

#[tauri::command]
pub async fn get_user_by_id(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
) -> Result<UserSession, String> {
    let collection = db_manager.get_users_collection().await?;
    let object_id = crate::database::parse_object_id(&user_id)?;

    let user = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to find user: {}", e))?
        .ok_or_else(|| "User not found".to_string())?;

    Ok(UserSession {
        user_id: user.id.unwrap().to_hex(),
        username: user.username,
        email: user.email,
    })
}

#[tauri::command]
pub async fn change_password(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
    old_password: String,
    new_password: String,
) -> Result<String, String> {
    let collection = db_manager.get_users_collection().await?;
    let object_id = crate::database::parse_object_id(&user_id)?;

    // Get user
    let user = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to find user: {}", e))?
        .ok_or_else(|| "User not found".to_string())?;

    // Verify old password
    let valid = verify(&old_password, &user.password_hash)
        .map_err(|e| format!("Failed to verify password: {}", e))?;

    if !valid {
        return Err("Invalid old password".to_string());
    }

    // Hash new password
    let new_password_hash = hash(&new_password, DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    // Update password
    let update_doc = doc! {
        "$set": {
            "password_hash": new_password_hash,
            "updated_at": mongodb::bson::to_bson(&Utc::now()).unwrap()
        }
    };

    collection
        .update_one(doc! {"_id": object_id}, update_doc)
        .await
        .map_err(|e| format!("Failed to update password: {}", e))?;

    Ok("Password changed successfully".to_string())
}
