/// Tauri commands for mDNS sync functionality

use tauri::{State, AppHandle};
use crate::mdns_sync::{MdnsSyncManager, DiscoveredDevice, TrustedDevice};
use crate::models::SyncHistoryEntry;

/// Start mDNS discovery
#[tauri::command]
pub async fn start_mdns_discovery(
    sync_mgr: State<'_, MdnsSyncManager>,
    app: AppHandle,
) -> Result<(), String> {
    sync_mgr.start_with_app(app).await
}

/// Stop mDNS discovery
#[tauri::command]
pub async fn stop_mdns_discovery(
    sync_mgr: State<'_, MdnsSyncManager>,
) -> Result<(), String> {
    sync_mgr.stop().await
}

/// Get list of discovered devices
#[tauri::command]
pub async fn get_discovered_devices(
    sync_mgr: State<'_, MdnsSyncManager>,
) -> Result<Vec<DiscoveredDevice>, String> {
    sync_mgr.get_discovered_devices().await
}

/// Initiate pairing with a device (sends pairing request to target device)
/// Returns the PIN that should be displayed to the user
#[tauri::command]
pub async fn initiate_pairing(
    sync_mgr: State<'_, MdnsSyncManager>,
    target_device_id: String,
    target_device_name: String,
    target_ip: String,
    target_port: u16,
) -> Result<String, String> {
    use crate::mdns_sync::pairing::PairingManager;

    // Generate a PIN for this pairing session
    let pin = PairingManager::generate_pin();
    println!("🔢 [Pairing] Generated PIN: {}", pin);

    // Get my device info
    let my_device_id = sync_mgr.device_id().await;
    let my_device_name = sync_mgr.device_name().await;

    // Start a pairing session locally for the target device
    let pairing = sync_mgr.pairing_manager();
    pairing.start_pairing_session(target_device_id.clone(), pin.clone())?;

    // Send pairing request to target device
    let client = sync_mgr.sync_client();
    match client.send_pairing_request(
        &target_device_id,
        &target_ip,
        target_port,
        &my_device_id,
        &my_device_name,
        &pin,
    ).await {
        Ok(response) => {
            if response.success {
                println!("✅ [Pairing] Pairing request sent successfully");
                // Return the PIN so the UI can display it to the user
                // The user must tell the other device to enter this PIN
                Ok(pin)
            } else {
                Err(format!("Pairing failed: {}", response.message))
            }
        },
        Err(e) => Err(format!("Failed to send pairing request: {}", e)),
    }
}

/// Complete pairing after the other device confirmed (this device initiated pairing)
#[tauri::command]
pub fn complete_pairing(
    sync_mgr: State<'_, MdnsSyncManager>,
    target_device_id: String,
    target_device_name: String,
    pin: String,
) -> Result<TrustedDevice, String> {
    let pairing = sync_mgr.pairing_manager();
    pairing.confirm_pairing_with_name(&target_device_id, &pin, Some(target_device_name))
}

/// Respond to an incoming pairing request by entering the PIN
#[tauri::command]
pub fn respond_to_pairing(
    sync_mgr: State<'_, MdnsSyncManager>,
    device_id: String,
    _device_name: String,
    pin: String,
) -> Result<TrustedDevice, String> {
    let pairing = sync_mgr.pairing_manager();

    // Start a pairing session for this incoming request
    pairing.start_pairing_session(device_id.clone(), pin.clone())?;

    // Confirm the pairing with the PIN
    pairing.confirm_pairing(&device_id, &pin)
}

/// Confirm pairing with a device using PIN (legacy - kept for backward compatibility)
#[tauri::command]
pub fn confirm_pairing(
    sync_mgr: State<'_, MdnsSyncManager>,
    device_id: String,
    pin: String,
) -> Result<TrustedDevice, String> {
    let pairing = sync_mgr.pairing_manager();
    pairing.confirm_pairing(&device_id, &pin)
}

/// Get list of trusted (paired) devices
#[tauri::command]
pub fn get_trusted_devices(
    sync_mgr: State<'_, MdnsSyncManager>,
) -> Result<Vec<TrustedDevice>, String> {
    let pairing = sync_mgr.pairing_manager();
    pairing.get_trusted_devices()
}

/// Remove a trusted device (unpair)
#[tauri::command]
pub fn remove_trusted_device(
    sync_mgr: State<'_, MdnsSyncManager>,
    device_id: String,
) -> Result<(), String> {
    let pairing = sync_mgr.pairing_manager();
    pairing.remove_trusted_device(&device_id)
}

/// Sync with a trusted device
#[tauri::command]
pub async fn sync_with_device(
    sync_mgr: State<'_, MdnsSyncManager>,
    _app: AppHandle,
    device_id: String,
) -> Result<String, String> {
    let client = sync_mgr.sync_client();
    client.sync_with_device(&device_id).await
}

/// Get sync history
#[tauri::command]
pub fn get_sync_history(
    sync_mgr: State<'_, MdnsSyncManager>,
    device_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<SyncHistoryEntry>, String> {
    use crate::mdns_sync::history::SyncHistoryTracker;

    let db = sync_mgr.database();
    let tracker = SyncHistoryTracker::new(db);
    tracker.get_sync_history(device_id.as_deref(), limit)
}

/// Cancel an ongoing sync session
#[tauri::command]
pub async fn cancel_sync(
    _sync_mgr: State<'_, MdnsSyncManager>,
    _session_id: String,
) -> Result<(), String> {
    // Placeholder implementation
    Err("Not yet implemented".to_string())
}

/// Get mDNS diagnostics information
#[tauri::command]
pub async fn get_mdns_diagnostics(
    sync_mgr: State<'_, MdnsSyncManager>,
) -> Result<serde_json::Value, String> {
    sync_mgr.get_diagnostics().await
}
