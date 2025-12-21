/// mDNS-based local network synchronization module
///
/// This module provides peer-to-peer database synchronization between devices
/// on the same local network using mDNS for service discovery and HTTP for data transfer.

use std::sync::Arc;
use tokio::sync::Mutex;
use crate::local_db::LocalDatabase;

pub mod protocol;
pub mod discovery;
pub mod pairing;
pub mod server;
pub mod client;
pub mod transfer;
pub mod history;

pub use protocol::{HandshakeRequest, HandshakeResponse, SyncDirection};
pub use discovery::MdnsDiscovery;
pub use pairing::PairingManager;
pub use server::SyncServer;
pub use client::SyncClient;

// Re-export models that are used by this module
pub use crate::models::{DiscoveredDevice, TrustedDevice};

/// Main coordinator for mDNS sync functionality
pub struct MdnsSyncManager {
    discovery: Arc<Mutex<MdnsDiscovery>>,
    server: Arc<Mutex<Option<SyncServer>>>,
    pairing: Arc<PairingManager>,
    client: Arc<SyncClient>,
    db: Arc<LocalDatabase>,
}

impl MdnsSyncManager {
    /// Create a new MdnsSyncManager
    pub fn new(db: Arc<LocalDatabase>) -> Result<Self, String> {
        let pairing = Arc::new(PairingManager::new(db.clone())?);
        let discovery = Arc::new(Mutex::new(MdnsDiscovery::new()?));
        let client = Arc::new(SyncClient::new(db.clone(), pairing.clone()));

        Ok(Self {
            discovery,
            server: Arc::new(Mutex::new(None)),
            pairing,
            client,
            db,
        })
    }

    /// Start mDNS discovery and HTTP server
    pub async fn start(&self) -> Result<(), String> {
        println!("\n🚀 [MdnsSyncManager] Starting mDNS sync...");

        // Start HTTP server first to get the port
        println!("1️⃣  [MdnsSyncManager] Starting HTTP server...");
        let mut server_lock = self.server.lock().await;
        if server_lock.is_none() {
            let server = SyncServer::new(self.db.clone(), self.pairing.clone()).await?;
            let port = server.port();
            println!("   ✅ HTTP server created on port: {}", port);

            server.start().await?;
            println!("   ✅ HTTP server started");

            // Update discovery with the server port
            println!("2️⃣  [MdnsSyncManager] Updating discovery with port {}...", port);
            let mut discovery = self.discovery.lock().await;
            discovery.update_port(port).await?;
            println!("   ✅ Port updated in discovery");
            drop(discovery);

            *server_lock = Some(server);
        } else {
            println!("   ℹ️  HTTP server already running");
        }
        drop(server_lock);

        // Now start mDNS advertising and browsing
        println!("3️⃣  [MdnsSyncManager] Starting mDNS advertising...");
        let mut discovery = self.discovery.lock().await;
        discovery.start_advertising().await?;

        println!("4️⃣  [MdnsSyncManager] Starting mDNS browsing...");
        discovery.start_browsing().await?;

        println!("✅ [MdnsSyncManager] mDNS sync started successfully!\n");
        Ok(())
    }

    /// Start mDNS discovery and HTTP server with app handle for events
    pub async fn start_with_app(&self, app_handle: tauri::AppHandle) -> Result<(), String> {
        println!("\n🚀 [MdnsSyncManager] Starting mDNS sync with app handle...");

        // Start HTTP server first to get the port
        println!("1️⃣  [MdnsSyncManager] Starting HTTP server...");
        let mut server_lock = self.server.lock().await;
        if server_lock.is_none() {
            let mut server = SyncServer::new(self.db.clone(), self.pairing.clone()).await?;
            server.set_app_handle(app_handle);
            let port = server.port();
            println!("   ✅ HTTP server created on port: {}", port);

            server.start().await?;
            println!("   ✅ HTTP server started");

            // Update discovery with the server port
            println!("2️⃣  [MdnsSyncManager] Updating discovery with port {}...", port);
            let mut discovery = self.discovery.lock().await;
            discovery.update_port(port).await?;
            println!("   ✅ Port updated in discovery");
            drop(discovery);

            *server_lock = Some(server);
        } else {
            println!("   ℹ️  HTTP server already running");
        }
        drop(server_lock);

        // Now start mDNS advertising and browsing
        println!("3️⃣  [MdnsSyncManager] Starting mDNS advertising...");
        let mut discovery = self.discovery.lock().await;
        discovery.start_advertising().await?;

        println!("4️⃣  [MdnsSyncManager] Starting mDNS browsing...");
        discovery.start_browsing().await?;

        println!("✅ [MdnsSyncManager] mDNS sync started successfully!\n");
        Ok(())
    }

    /// Stop mDNS discovery and HTTP server
    pub async fn stop(&self) -> Result<(), String> {
        // Stop mDNS discovery
        let mut discovery = self.discovery.lock().await;
        discovery.stop_advertising().await?;
        discovery.stop_browsing().await?;
        drop(discovery);

        // Stop HTTP server
        let mut server_lock = self.server.lock().await;
        if let Some(server) = server_lock.take() {
            server.stop().await?;
        }

        Ok(())
    }

    /// Get list of discovered devices
    pub async fn get_discovered_devices(&self) -> Result<Vec<DiscoveredDevice>, String> {
        println!("🔍 [MdnsSyncManager] get_discovered_devices called");
        let discovery = self.discovery.lock().await;
        let my_device_id = discovery.device_id().to_string();
        let mut devices = discovery.get_discovered_devices().await?;

        println!("📊 [MdnsSyncManager] Raw discovered devices count: {}", devices.len());

        // Filter out self from the list
        devices.retain(|device| {
            if device.device_id == my_device_id {
                println!("   🚫 Filtering out self: {} ({})", device.device_name, device.device_id);
                false
            } else {
                true
            }
        });

        println!("📊 [MdnsSyncManager] After filtering self: {} devices", devices.len());

        // Mark devices as trusted if they're in our trusted devices list
        for device in &mut devices {
            let is_trusted = self.pairing.is_device_trusted(&device.device_id)?;
            device.is_trusted = is_trusted;
            println!("   Device: {} - Trusted: {}", device.device_name, is_trusted);
        }

        println!("✅ [MdnsSyncManager] Returning {} devices", devices.len());
        Ok(devices)
    }

    /// Get the pairing manager for device pairing operations
    pub fn pairing_manager(&self) -> Arc<PairingManager> {
        self.pairing.clone()
    }

    /// Get the sync client for initiating sync operations
    pub fn sync_client(&self) -> Arc<SyncClient> {
        self.client.clone()
    }

    /// Get the database reference
    pub fn database(&self) -> Arc<LocalDatabase> {
        self.db.clone()
    }

    /// Get the local device ID
    pub async fn device_id(&self) -> String {
        let discovery = self.discovery.lock().await;
        discovery.device_id().to_string()
    }

    /// Get the local device name
    pub async fn device_name(&self) -> String {
        let discovery = self.discovery.lock().await;
        discovery.device_name().to_string()
    }

    /// Get diagnostics information for troubleshooting
    pub async fn get_diagnostics(&self) -> Result<serde_json::Value, String> {
        use serde_json::json;

        let discovery = self.discovery.lock().await;
        let devices = discovery.get_discovered_devices().await?;

        let server_lock = self.server.lock().await;
        let server_running = server_lock.is_some();
        let server_port = if let Some(server) = server_lock.as_ref() {
            Some(server.port())
        } else {
            None
        };
        drop(server_lock);

        Ok(json!({
            "device_id": discovery.device_id(),
            "device_name": discovery.device_name(),
            "server_running": server_running,
            "server_port": server_port,
            "discovered_devices_count": devices.len(),
            "discovered_devices": devices,
            "network_info": self.get_network_info(),
        }))
    }

    /// Get network interface information
    fn get_network_info(&self) -> serde_json::Value {
        use serde_json::json;
        use std::net::UdpSocket;

        // Try to get local IP addresses
        let mut ips = Vec::new();

        // Get all network interfaces
        if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
            if let Ok(addr) = socket.local_addr() {
                ips.push(addr.ip().to_string());
            }
        }

        json!({
            "local_addresses": ips,
            "mdns_multicast": "224.0.0.251:5353",
            "note": "Ensure UDP port 5353 is open for mDNS multicast"
        })
    }
}
