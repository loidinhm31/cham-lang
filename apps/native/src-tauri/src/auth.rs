use qm_sync_client::{ReqwestHttpClient, QmSyncClient, SyncClientConfig};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri_plugin_store::StoreExt;
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305
};
use argon2::{Argon2, PasswordHasher};
use argon2::password_hash::SaltString;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use jsonwebtoken::{decode, decode_header, DecodingKey, Validation};
use tokio::sync::RwLock;


/// Public user info returned by lookup
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PublicUserInfo {
    pub user_id: String,
    pub username: String,
}

/// Authentication service for managing user authentication with qm-sync
pub struct AuthService {
    sync_client: Arc<RwLock<QmSyncClient<ReqwestHttpClient>>>,
    server_url: String,
    default_app_id: String,
    default_api_key: String,
}

impl Clone for AuthService {
    fn clone(&self) -> Self {
        Self {
            sync_client: Arc::clone(&self.sync_client),
            server_url: self.server_url.clone(),
            default_app_id: self.default_app_id.clone(),
            default_api_key: self.default_api_key.clone(),
        }
    }
}

/// Response from register/login endpoints
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub user_id: String,
    pub access_token: String,
    pub refresh_token: String,
    #[serde(default)]
    pub apps: Option<Vec<String>>,
    #[serde(default)]
    pub is_admin: Option<bool>,
}

/// Authentication status
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub user_id: Option<String>,
    pub apps: Option<Vec<String>>,
    pub is_admin: Option<bool>,
    pub server_url: Option<String>,
}

/// Store keys for secure token storage
const STORE_FILE: &str = "auth.json";
const KEY_ACCESS_TOKEN: &str = "access_token";
const KEY_REFRESH_TOKEN: &str = "refresh_token";
const KEY_USER_ID: &str = "user_id";
const KEY_APPS: &str = "apps";
const KEY_IS_ADMIN: &str = "is_admin";
const KEY_SERVER_URL: &str = "server_url";
const KEY_APP_ID: &str = "app_id";
const KEY_API_KEY: &str = "api_key";

/// JWT token claims for validation
#[derive(Debug, serde::Deserialize)]
struct TokenClaims {
    exp: i64,
    #[allow(dead_code)]
    iat: Option<i64>,
    #[allow(dead_code)]
    sub: Option<String>,
}

/// Check if a JWT token is expired
fn is_token_expired(token: &str) -> Result<bool, String> {
    let header = decode_header(token)
        .map_err(|e| format!("Failed to decode token header: {}", e))?;

    let mut validation = Validation::new(header.alg);
    validation.insecure_disable_signature_validation();
    validation.validate_exp = false;

    let token_data = decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(&[]),
        &validation,
    )
    .map_err(|e| format!("Failed to decode token: {}", e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Failed to get current time: {}", e))?
        .as_secs() as i64;

    Ok(token_data.claims.exp < now)
}

/// Encryption helpers for secure token storage
mod crypto {
    use super::*;

    fn get_device_identifier() -> Result<String, String> {
        #[cfg(target_os = "android")]
        {
            use sha2::{Sha256, Digest};
            let android_id = std::env::var("ANDROID_DATA")
                .or_else(|_| std::env::var("EXTERNAL_STORAGE"))
                .unwrap_or_else(|_| "cham-lang-android-device".to_string());
            let mut hasher = Sha256::new();
            hasher.update(android_id.as_bytes());
            hasher.update(b"cham-lang-unique-salt");
            let result = hasher.finalize();
            Ok(hex::encode(result))
        }

        #[cfg(not(target_os = "android"))]
        {
            machine_uid::get()
                .map_err(|e| format!("Failed to get machine ID: {}", e))
        }
    }

    fn derive_encryption_key() -> Result<[u8; 32], String> {
        let machine_id = get_device_identifier()?;
        let app_salt = b"cham-lang-auth-v1";
        let combined = format!("{}{}", machine_id, String::from_utf8_lossy(app_salt));

        // Base64 of "chamlang-salt12345678" (22 chars for Argon2 salt)
        let salt = SaltString::from_b64("Y2hhbWxhbmdzYWx0MTIzNDU2Nzg5MA")
            .map_err(|e| format!("Failed to create salt: {}", e))?;

        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(combined.as_bytes(), &salt)
            .map_err(|e| format!("Failed to hash password: {}", e))?;

        let hash_str = password_hash.hash.ok_or("No hash generated")?;
        let hash_bytes = hash_str.as_bytes();

        if hash_bytes.len() < 32 {
            return Err("Hash too short".to_string());
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&hash_bytes[..32]);
        Ok(key)
    }

    pub fn encrypt(plaintext: &str) -> Result<String, String> {
        let key_bytes = derive_encryption_key()?;
        let cipher = ChaCha20Poly1305::new_from_slice(&key_bytes)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        let nonce_bytes: [u8; 12] = rand::random();
        let nonce = chacha20poly1305::Nonce::from(nonce_bytes);

        let ciphertext = cipher
            .encrypt(&nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(BASE64.encode(&result))
    }

    pub fn decrypt(encrypted: &str) -> Result<String, String> {
        let key_bytes = derive_encryption_key()?;
        let cipher = ChaCha20Poly1305::new_from_slice(&key_bytes)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        let encrypted_bytes = BASE64
            .decode(encrypted)
            .map_err(|e| format!("Failed to decode base64: {}", e))?;

        if encrypted_bytes.len() < 12 {
            return Err("Encrypted data too short".to_string());
        }

        let (nonce_bytes, ciphertext) = encrypted_bytes.split_at(12);

        let mut nonce_array = [0u8; 12];
        nonce_array.copy_from_slice(nonce_bytes);
        let nonce = chacha20poly1305::Nonce::from(nonce_array);

        let plaintext_bytes = cipher
            .decrypt(&nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext_bytes)
            .map_err(|e| format!("Failed to convert decrypted data to string: {}", e))
    }
}

impl AuthService {
    pub fn new(server_url: String, default_app_id: String, default_api_key: String) -> Self {
        let config = SyncClientConfig::new(&server_url, &default_app_id, &default_api_key);
        let http = ReqwestHttpClient::new();
        let sync_client = QmSyncClient::new(config, http);

        Self {
            sync_client: Arc::new(RwLock::new(sync_client)),
            server_url,
            default_app_id,
            default_api_key,
        }
    }

    pub async fn set_server_url(&self, server_url: String) {
        let config = SyncClientConfig::new(&server_url, &self.default_app_id, &self.default_api_key);
        let http = ReqwestHttpClient::new();
        let new_client = QmSyncClient::new(config, http);

        let mut client = self.sync_client.write().await;
        *client = new_client;
    }

    pub async fn register(
        &self,
        app_handle: &tauri::AppHandle,
        username: String,
        email: String,
        password: String,
    ) -> Result<AuthResponse, String> {
        let app_id = self.default_app_id.clone();
        let api_key = self.default_api_key.clone();

        let client = self.sync_client.read().await;
        let result = client
            .register(&username, &email, &password)
            .await
            .map_err(|e| format!("Registration failed: {}", e))?;

        let auth_response = AuthResponse {
            user_id: result.user_id,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            apps: if result.apps.is_empty() { None } else { Some(result.apps) },
            is_admin: if result.is_admin { Some(true) } else { None },
        };

        self.store_auth_data(app_handle, &auth_response, &app_id, &api_key)
            .await?;

        Ok(auth_response)
    }

    pub async fn login(
        &self,
        app_handle: &tauri::AppHandle,
        email: String,
        password: String,
    ) -> Result<AuthResponse, String> {
        let app_id = self.default_app_id.clone();
        let api_key = self.default_api_key.clone();

        let client = self.sync_client.read().await;
        let result = client
            .login(&email, &password)
            .await
            .map_err(|e| format!("Login failed: {}", e))?;

        let auth_response = AuthResponse {
            user_id: result.user_id,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            apps: if result.apps.is_empty() { None } else { Some(result.apps) },
            is_admin: if result.is_admin { Some(true) } else { None },
        };

        self.store_auth_data(app_handle, &auth_response, &app_id, &api_key)
            .await?;

        Ok(auth_response)
    }

    pub async fn refresh_token(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), String> {
        let refresh_token = self.get_refresh_token(app_handle).await?;
        let access_token = self.get_access_token(app_handle).await.unwrap_or_default();

        {
            let client = self.sync_client.read().await;
            client.set_tokens(access_token, refresh_token, None).await;
        }

        {
            let client = self.sync_client.read().await;
            client
                .refresh_token()
                .await
                .map_err(|e| format!("Token refresh failed: {}", e))?;
        }

        let (new_access, new_refresh) = {
            let client = self.sync_client.read().await;
            client.get_tokens().await
        };

        self.update_tokens_raw(
            app_handle,
            &new_access.ok_or_else(|| "No access token after refresh".to_string())?,
            &new_refresh.ok_or_else(|| "No refresh token after refresh".to_string())?,
        )
        .await?;

        Ok(())
    }

    pub async fn logout(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store.delete(KEY_ACCESS_TOKEN);
        store.delete(KEY_REFRESH_TOKEN);
        store.delete(KEY_USER_ID);
        store.delete(KEY_APPS);
        store.delete(KEY_IS_ADMIN);
        store.delete(KEY_APP_ID);
        store.delete(KEY_API_KEY);

        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    pub async fn get_access_token(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted = store
            .get(KEY_ACCESS_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No access token found".to_string())?;

        crypto::decrypt(&encrypted)
    }

    pub async fn lookup_user(
        &self,
        app_handle: &tauri::AppHandle,
        username: String,
    ) -> Result<Option<PublicUserInfo>, String> {
        // Ensure authenticated before calling (although client.lookup_user will use cached token,
        // we might want to refresh if needed, similar to is_authenticated)
        if !self.is_authenticated(app_handle).await {
            return Err("Not authenticated".to_string());
        }

        let access_token = self.get_access_token(app_handle).await.unwrap_or_default();
        let api_key = self.get_stored_api_key(app_handle).unwrap_or(self.default_api_key.clone());
        let app_id = self.get_stored_app_id(app_handle).await.unwrap_or(self.default_app_id.clone());
        
        // Refresh token if needed
        let refresh_token = self.get_refresh_token(app_handle).await.unwrap_or_default();
        {
            let client = self.sync_client.read().await;
            client.set_tokens(access_token.clone(), refresh_token, None).await;
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct LookupResponse {
            user: Option<PublicUserInfo>,
        }

        let url = format!("{}/api/v1/auth/lookup?username={}", self.server_url, username);
        let client = reqwest::Client::new();
        
        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("X-App-ID", app_id)
            .header("X-API-Key", api_key)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
             return Err(format!(
                "Lookup failed: {} - {}",
                response.status(),
                response.text().await.unwrap_or_default()
            ));
        }

        let result: LookupResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(result.user)
    }

    pub async fn get_refresh_token(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted = store
            .get(KEY_REFRESH_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No refresh token found".to_string())?;

        crypto::decrypt(&encrypted)
    }

    async fn get_stored_app_id(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store
            .get(KEY_APP_ID)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No app ID found".to_string())
    }

    pub fn get_stored_api_key(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted = store
            .get(KEY_API_KEY)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No API key found".to_string())?;

        crypto::decrypt(&encrypted)
    }

    pub async fn is_authenticated(&self, app_handle: &tauri::AppHandle) -> bool {
        let token = match self.get_access_token(app_handle).await {
            Ok(t) => t,
            Err(_) => return false,
        };

        match is_token_expired(&token) {
            Ok(true) => {
                self.refresh_token(app_handle).await.is_ok()
            }
            Ok(false) => true,
            Err(_) => false,
        }
    }

    pub async fn get_auth_status(&self, app_handle: &tauri::AppHandle) -> AuthStatus {
        let store = match app_handle.store(STORE_FILE) {
            Ok(s) => s,
            Err(_) => {
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                }
            }
        };

        let encrypted_token = store
            .get(KEY_ACCESS_TOKEN)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        if encrypted_token.is_none() {
            return AuthStatus {
                is_authenticated: false,
                user_id: None,
                apps: None,
                is_admin: None,
                server_url: Some(self.server_url.clone()),
            };
        }

        let access_token = match crypto::decrypt(&encrypted_token.unwrap()) {
            Ok(token) => token,
            Err(_) => {
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                }
            }
        };

        let is_expired = is_token_expired(&access_token).unwrap_or(true);
        if is_expired {
            if self.refresh_token(app_handle).await.is_err() {
                return AuthStatus {
                    is_authenticated: false,
                    user_id: None,
                    apps: None,
                    is_admin: None,
                    server_url: Some(self.server_url.clone()),
                };
            }
        }

        let user_id = store
            .get(KEY_USER_ID)
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        let apps = store.get(KEY_APPS).and_then(|v| {
            v.as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        });

        let is_admin = store.get(KEY_IS_ADMIN).and_then(|v| v.as_bool());

        AuthStatus {
            is_authenticated: true,
            user_id,
            apps,
            is_admin,
            server_url: Some(self.server_url.clone()),
        }
    }

    async fn store_auth_data(
        &self,
        app_handle: &tauri::AppHandle,
        auth_response: &AuthResponse,
        app_id: &str,
        api_key: &str,
    ) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted_access_token = crypto::encrypt(&auth_response.access_token)?;
        let encrypted_refresh_token = crypto::encrypt(&auth_response.refresh_token)?;
        let encrypted_api_key = crypto::encrypt(api_key)?;

        store.set(KEY_ACCESS_TOKEN, serde_json::json!(encrypted_access_token));
        store.set(KEY_REFRESH_TOKEN, serde_json::json!(encrypted_refresh_token));
        store.set(KEY_USER_ID, serde_json::json!(&auth_response.user_id));
        store.set(KEY_SERVER_URL, serde_json::json!(&self.server_url));
        store.set(KEY_APP_ID, serde_json::json!(app_id));
        store.set(KEY_API_KEY, serde_json::json!(encrypted_api_key));

        if let Some(apps) = &auth_response.apps {
            store.set(KEY_APPS, serde_json::json!(apps));
        }

        if let Some(is_admin) = auth_response.is_admin {
            store.set(KEY_IS_ADMIN, serde_json::json!(is_admin));
        }

        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    async fn update_tokens_raw(
        &self,
        app_handle: &tauri::AppHandle,
        access_token: &str,
        refresh_token: &str,
    ) -> Result<(), String> {
        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted_access_token = crypto::encrypt(access_token)?;
        let encrypted_refresh_token = crypto::encrypt(refresh_token)?;

        store.set(KEY_ACCESS_TOKEN, serde_json::json!(encrypted_access_token));
        store.set(KEY_REFRESH_TOKEN, serde_json::json!(encrypted_refresh_token));

        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    pub async fn configure_sync(
        &self,
        app_handle: &tauri::AppHandle,
        server_url: Option<String>,
        app_id: Option<String>,
        api_key: Option<String>,
    ) -> Result<(), String> {
        let new_server_url = server_url.unwrap_or_else(|| self.server_url.clone());
        let app_id = app_id.unwrap_or_else(|| self.default_app_id.clone());
        let api_key = api_key.unwrap_or_else(|| self.default_api_key.clone());

        self.set_server_url(new_server_url.clone()).await;

        let store = app_handle
            .store(STORE_FILE)
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let encrypted_api_key = crypto::encrypt(&api_key)?;

        store.set(KEY_SERVER_URL, serde_json::json!(new_server_url));
        store.set(KEY_APP_ID, serde_json::json!(app_id));
        store.set(KEY_API_KEY, serde_json::json!(encrypted_api_key));

        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        Ok(())
    }

    pub fn sync_client(&self) -> Arc<RwLock<QmSyncClient<ReqwestHttpClient>>> {
        Arc::clone(&self.sync_client)
    }
}
