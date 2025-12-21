/// Device pairing and authentication management

use std::collections::HashMap;
use std::sync::{Arc, Mutex as StdMutex};
use chrono::Utc;
use rand::Rng;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use rusqlite::params;
use base64::{Engine as _, engine::general_purpose};
use crate::local_db::LocalDatabase;
use crate::models::TrustedDevice;
use super::protocol::{AUTH_TOKEN_VALIDITY_SECONDS, PAIRING_PIN_TIMEOUT_SECONDS};

type HmacSha256 = Hmac<Sha256>;

struct PairingSession {
    device_id: String,
    pin: String,
    expires_at: i64,
}

/// Manages device pairing and trust relationships
pub struct PairingManager {
    db: Arc<LocalDatabase>,
    active_pins: Arc<StdMutex<HashMap<String, PairingSession>>>,
}

impl PairingManager {
    /// Create a new PairingManager
    pub fn new(db: Arc<LocalDatabase>) -> Result<Self, String> {
        Ok(Self {
            db,
            active_pins: Arc::new(StdMutex::new(HashMap::new())),
        })
    }

    /// Generate a random 6-digit PIN
    pub fn generate_pin() -> String {
        let mut rng = rand::thread_rng();
        format!("{:06}", rng.gen_range(0..1000000))
    }

    /// Start a pairing session with a generated PIN
    pub fn start_pairing_session(&self, device_id: String, pin: String) -> Result<String, String> {
        let expires_at = Utc::now().timestamp() + PAIRING_PIN_TIMEOUT_SECONDS;

        let session = PairingSession {
            device_id: device_id.clone(),
            pin: pin.clone(),
            expires_at,
        };

        let mut pins = self.active_pins.lock().unwrap();
        pins.insert(device_id.clone(), session);

        Ok(pin)
    }

    /// Confirm pairing with a PIN
    pub fn confirm_pairing(&self, device_id: &str, pin: &str) -> Result<TrustedDevice, String> {
        self.confirm_pairing_with_name(device_id, pin, None)
    }

    /// Confirm pairing with a PIN and optional device name
    pub fn confirm_pairing_with_name(&self, device_id: &str, pin: &str, device_name: Option<String>) -> Result<TrustedDevice, String> {
        // Check if there's an active pairing session
        let pins = self.active_pins.lock().unwrap();
        let session = pins.get(device_id)
            .ok_or_else(|| "No active pairing session found".to_string())?;

        // Check PIN matches
        if session.pin != pin {
            return Err("Invalid PIN".to_string());
        }

        // Check not expired
        if Utc::now().timestamp() > session.expires_at {
            return Err("PIN expired".to_string());
        }

        // Generate shared secret
        let shared_secret = self.derive_shared_secret(device_id, pin)?;

        // Store in database
        let device_name = device_name.unwrap_or_else(|| format!("Device {}", &device_id[..8]));
        let now = Utc::now().timestamp();
        let id = uuid::Uuid::new_v4().to_string();

        let trusted_device = TrustedDevice {
            id: id.clone(),
            device_id: device_id.to_string(),
            device_name: device_name.clone(),
            shared_secret: shared_secret.clone(),
            first_paired_at: now,
            last_synced_at: None,
            sync_count: 0,
            created_at: now,
            updated_at: now,
        };

        // Insert into database
        let conn = self.db.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO trusted_devices (id, device_id, device_name, shared_secret, first_paired_at, sync_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, device_id, device_name, shared_secret, now, 0, now, now],
        ).map_err(|e| format!("Failed to store trusted device: {}", e))?;

        Ok(trusted_device)
    }

    /// Derive a shared secret from device IDs and PIN
    fn derive_shared_secret(&self, device_id: &str, pin: &str) -> Result<String, String> {
        let data = format!("{}{}", device_id, pin);
        let mut mac = HmacSha256::new_from_slice(pin.as_bytes())
            .map_err(|e| format!("Failed to create HMAC: {}", e))?;
        mac.update(data.as_bytes());
        let result = mac.finalize();
        Ok(general_purpose::STANDARD.encode(result.into_bytes()))
    }

    /// Generate an authentication token for a sync session
    pub fn generate_auth_token(&self, device_id: &str) -> Result<String, String> {
        let shared_secret = self.get_shared_secret(device_id)?;
        let timestamp = Utc::now().timestamp();
        let message = format!("{}:{}", device_id, timestamp);

        let mut mac = HmacSha256::new_from_slice(shared_secret.as_bytes())
            .map_err(|e| format!("Failed to create HMAC: {}", e))?;
        mac.update(message.as_bytes());
        let result = mac.finalize();

        Ok(format!("{}:{}", timestamp, general_purpose::STANDARD.encode(result.into_bytes())))
    }

    /// Validate an authentication token
    pub fn validate_auth_token(&self, device_id: &str, token: &str) -> Result<bool, String> {
        let parts: Vec<&str> = token.split(':').collect();
        if parts.len() != 2 {
            return Ok(false);
        }

        let timestamp: i64 = parts[0].parse().map_err(|_| "Invalid timestamp")?;
        let provided_hmac = parts[1];

        // Check timestamp is within validity window
        let now = Utc::now().timestamp();
        if (now - timestamp).abs() > AUTH_TOKEN_VALIDITY_SECONDS {
            return Ok(false);
        }

        // Verify HMAC
        let shared_secret = self.get_shared_secret(device_id)?;
        let message = format!("{}:{}", device_id, timestamp);

        let mut mac = HmacSha256::new_from_slice(shared_secret.as_bytes())
            .map_err(|e| format!("Failed to create HMAC: {}", e))?;
        mac.update(message.as_bytes());
        let expected_hmac = general_purpose::STANDARD.encode(mac.finalize().into_bytes());

        Ok(expected_hmac == provided_hmac)
    }

    /// Get the shared secret for a trusted device
    pub fn get_shared_secret(&self, device_id: &str) -> Result<String, String> {
        let conn = self.db.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT shared_secret FROM trusted_devices WHERE device_id = ?1")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        stmt.query_row(params![device_id], |row| row.get(0))
            .map_err(|e| format!("Device not trusted: {}", e))
    }

    /// Check if a device is trusted
    pub fn is_device_trusted(&self, device_id: &str) -> Result<bool, String> {
        let conn = self.db.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM trusted_devices WHERE device_id = ?1")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let count: i64 = stmt.query_row(params![device_id], |row| row.get(0))
            .map_err(|e| format!("Failed to check trust: {}", e))?;

        Ok(count > 0)
    }

    /// Get all trusted devices
    pub fn get_trusted_devices(&self) -> Result<Vec<TrustedDevice>, String> {
        let conn = self.db.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, device_id, device_name, shared_secret, first_paired_at, last_synced_at, sync_count, created_at, updated_at
             FROM trusted_devices
             ORDER BY last_synced_at DESC, first_paired_at DESC"
        ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let devices = stmt.query_map([], |row| {
            Ok(TrustedDevice {
                id: row.get(0)?,
                device_id: row.get(1)?,
                device_name: row.get(2)?,
                shared_secret: row.get(3)?,
                first_paired_at: row.get(4)?,
                last_synced_at: row.get(5)?,
                sync_count: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query devices: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect devices: {}", e))?;

        Ok(devices)
    }

    /// Remove a trusted device
    pub fn remove_trusted_device(&self, device_id: &str) -> Result<(), String> {
        let conn = self.db.conn.lock().unwrap();
        conn.execute("DELETE FROM trusted_devices WHERE device_id = ?1", params![device_id])
            .map_err(|e| format!("Failed to remove device: {}", e))?;

        Ok(())
    }

    /// Update last synced timestamp for a device
    pub fn update_last_synced(&self, device_id: &str) -> Result<(), String> {
        let now = Utc::now().timestamp();
        let conn = self.db.conn.lock().unwrap();
        conn.execute(
            "UPDATE trusted_devices SET last_synced_at = ?1, sync_count = sync_count + 1, updated_at = ?2 WHERE device_id = ?3",
            params![now, now, device_id],
        ).map_err(|e| format!("Failed to update last synced: {}", e))?;

        Ok(())
    }
}
