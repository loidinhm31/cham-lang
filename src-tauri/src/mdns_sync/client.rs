/// HTTP client for initiating sync requests

use std::sync::Arc;
use crate::local_db::LocalDatabase;
use crate::models::{PairingRequest, PairingResponse};
use super::pairing::PairingManager;

pub struct SyncClient {
    _db: Arc<LocalDatabase>,
    _pairing: Arc<PairingManager>,
}

impl SyncClient {
    pub fn new(db: Arc<LocalDatabase>, pairing: Arc<PairingManager>) -> Self {
        Self {
            _db: db,
            _pairing: pairing,
        }
    }

    /// Send a pairing request to a discovered device
    pub async fn send_pairing_request(
        &self,
        _target_device_id: &str,
        target_ip: &str,
        target_port: u16,
        my_device_id: &str,
        my_device_name: &str,
        pin: &str,
    ) -> Result<PairingResponse, String> {
        // Format URL properly for IPv6 addresses
        let url = if target_ip.contains(':') {
            // IPv6 address - wrap in brackets
            // Note: Link-local addresses (fe80::) may not work without zone ID
            // We'll try without zone ID first, and let the connection fail if needed
            format!("http://[{}]:{}/pair", target_ip, target_port)
        } else {
            // IPv4 address
            format!("http://{}:{}/pair", target_ip, target_port)
        };

        println!("📤 [SyncClient] Sending pairing request to {} with PIN", url);

        let request = PairingRequest {
            device_id: my_device_id.to_string(),
            device_name: my_device_name.to_string(),
            pin: pin.to_string(),
        };

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let response = client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Failed to send pairing request: {}", e))?;

        let pairing_response: PairingResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse pairing response: {}", e))?;

        if pairing_response.success {
            println!("✅ [SyncClient] Pairing request successful");
        } else {
            println!("❌ [SyncClient] Pairing request failed: {}", pairing_response.message);
        }

        Ok(pairing_response)
    }

    pub async fn sync_with_device(&self, _device_id: &str) -> Result<String, String> {
        // Placeholder implementation
        Ok("sync_session_id".to_string())
    }
}
