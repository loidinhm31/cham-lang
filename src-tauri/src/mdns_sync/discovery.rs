/// mDNS service discovery and advertising

use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use sha2::{Sha256, Digest};
use crate::models::DiscoveredDevice;
use super::protocol::SERVICE_TYPE;
use std::net::{IpAddr, Ipv4Addr};

/// Check if an IP address is link-local (169.254.x.x for IPv4)
fn is_link_local(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            let octets = ipv4.octets();
            octets[0] == 169 && octets[1] == 254
        }
        IpAddr::V6(ipv6) => ipv6.segments()[0] == 0xfe80,
    }
}

/// Check if an IP address is from Tailscale (100.x.x.x range)
fn is_tailscale(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            let octets = ipv4.octets();
            octets[0] == 100 && octets[1] >= 64 && octets[1] <= 127
        }
        IpAddr::V6(_) => false,
    }
}

/// mDNS discovery manager
pub struct MdnsDiscovery {
    daemon: ServiceDaemon,
    device_id: String,
    device_name: String,
    port: u16,
    discovered_devices: Arc<Mutex<HashMap<String, DiscoveredDevice>>>,
}

impl MdnsDiscovery {
    /// Create a new mDNS discovery instance
    pub fn new() -> Result<Self, String> {
        let daemon = ServiceDaemon::new()
            .map_err(|e| format!("Failed to create mDNS daemon: {}", e))?;

        let device_id = Self::generate_device_id()?;
        let device_name = Self::get_device_name()?;

        Ok(Self {
            daemon,
            device_id,
            device_name,
            port: 0, // Will be set when server starts
            discovered_devices: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    /// Generate a persistent device ID based on hardware identifiers
    fn generate_device_id() -> Result<String, String> {
        // Combine hostname and MAC address for a persistent ID
        let hostname = hostname::get()
            .map_err(|e| format!("Failed to get hostname: {}", e))?
            .to_string_lossy()
            .to_string();

        let mac = mac_address::get_mac_address()
            .map_err(|e| format!("Failed to get MAC address: {}", e))?
            .map(|addr| addr.to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let combined = format!("{}{}", hostname, mac);
        let mut hasher = Sha256::new();
        hasher.update(combined.as_bytes());
        let result = hasher.finalize();

        Ok(hex::encode(&result[..16])) // Use first 16 bytes (32 hex chars)
    }

    /// Get a user-friendly device name
    fn get_device_name() -> Result<String, String> {
        let hostname = hostname::get()
            .map_err(|e| format!("Failed to get hostname: {}", e))?
            .to_string_lossy()
            .to_string();

        Ok(hostname)
    }

    /// Update the port after server starts
    pub async fn update_port(&mut self, port: u16) -> Result<(), String> {
        self.port = port;
        Ok(())
    }

    /// Get local IP addresses for mDNS advertising
    fn get_local_addresses() -> Vec<IpAddr> {
        use std::net::UdpSocket;

        let mut addresses = Vec::new();

        // Try to get the primary local IP by connecting to a public address
        // This doesn't actually send data, just determines routing
        if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
            if let Ok(()) = socket.connect("8.8.8.8:80") {
                if let Ok(addr) = socket.local_addr() {
                    let ip = addr.ip();
                    println!("   📍 [mDNS] Detected primary IP: {}", ip);
                    addresses.push(ip);
                }
            }
        }

        // If we didn't get any addresses, try using network_interface crate
        // For now, fall back to trying common interfaces
        if addresses.is_empty() {
            println!("   ⚠️  [mDNS] Could not detect primary IP, trying to enumerate interfaces");

            // Try to use if_addrs crate if available, otherwise use system calls
            #[cfg(target_os = "linux")]
            {
                use std::process::Command;
                if let Ok(output) = Command::new("hostname").arg("-I").output() {
                    if let Ok(ips_str) = String::from_utf8(output.stdout) {
                        for ip_str in ips_str.split_whitespace() {
                            if let Ok(ip) = ip_str.parse::<IpAddr>() {
                                // Skip loopback, link-local, and Tailscale IPs
                                if !ip.is_loopback() && !is_link_local(&ip) && !is_tailscale(&ip) {
                                    println!("   📍 [mDNS] Found interface IP: {}", ip);
                                    addresses.push(ip);
                                }
                            }
                        }
                    }
                }
            }

            #[cfg(target_os = "windows")]
            {
                use std::process::Command;
                if let Ok(output) = Command::new("powershell")
                    .args(&["-Command", "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*WSL*'} | Select-Object -ExpandProperty IPAddress"])
                    .output()
                {
                    if let Ok(ips_str) = String::from_utf8(output.stdout) {
                        for ip_str in ips_str.lines() {
                            let ip_str = ip_str.trim();
                            if let Ok(ip) = ip_str.parse::<IpAddr>() {
                                if !ip.is_loopback() && !is_link_local(&ip) {
                                    println!("   📍 [mDNS] Found interface IP: {}", ip);
                                    addresses.push(ip);
                                }
                            }
                        }
                    }
                }
            }
        }

        if addresses.is_empty() {
            println!("   ⚠️  [mDNS] No suitable IP addresses found, using 0.0.0.0");
            addresses.push(IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)));
        }

        addresses
    }

    /// Start advertising the sync service
    pub async fn start_advertising(&self) -> Result<(), String> {
        if self.port == 0 {
            println!("❌ [mDNS] Port not set. Start server first.");
            return Err("Port not set. Start server first.".to_string());
        }

        let service_name = format!("chamlang-{}", &self.device_id[..8]);
        let host_name = format!("{}.local.", self.device_name);

        let mut properties = HashMap::new();
        properties.insert("device_id".to_string(), self.device_id.clone());
        properties.insert("device_name".to_string(), self.device_name.clone());
        properties.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());

        // Get local IP addresses to advertise
        let addresses = Self::get_local_addresses();

        println!("📢 [mDNS] Starting to advertise service:");
        println!("   Service Name: {}", service_name);
        println!("   Host Name: {}", host_name);
        println!("   Service Type: {}", SERVICE_TYPE);
        println!("   Port: {}", self.port);
        println!("   Addresses: {:?}", addresses);
        println!("   Device ID: {}", self.device_id);
        println!("   Device Name: {}", self.device_name);
        println!("   Version: {}", env!("CARGO_PKG_VERSION"));

        let service_info = ServiceInfo::new(
            SERVICE_TYPE,
            &service_name,
            &host_name,
            addresses.as_slice(),
            self.port,
            Some(properties),
        )
        .map_err(|e| {
            println!("❌ [mDNS] Failed to create service info: {}", e);
            format!("Failed to create service info: {}", e)
        })?;

        self.daemon.register(service_info)
            .map_err(|e| {
                println!("❌ [mDNS] Failed to register service: {}", e);
                format!("Failed to register service: {}", e)
            })?;

        println!("✅ [mDNS] Service registered successfully!");
        Ok(())
    }

    /// Stop advertising the sync service
    pub async fn stop_advertising(&self) -> Result<(), String> {
        // mDNS daemon will automatically unregister when dropped
        Ok(())
    }

    /// Start browsing for other devices
    pub async fn start_browsing(&self) -> Result<(), String> {
        println!("🔍 [mDNS] Starting to browse for services...");
        println!("   Looking for service type: {}", SERVICE_TYPE);

        let discovered = self.discovered_devices.clone();

        let browse_result = self.daemon.browse(SERVICE_TYPE)
            .map_err(|e| {
                println!("❌ [mDNS] Failed to start browsing: {}", e);
                format!("Failed to start browsing: {}", e)
            })?;

        println!("✅ [mDNS] Browsing started successfully!");

        // Spawn a background task to handle discovered services
        tokio::spawn(async move {
            println!("🎯 [mDNS] Background listener task started");
            while let Ok(event) = browse_result.recv_async().await {
                println!("📡 [mDNS] Received event: {:?}", event);
                match event {
                    mdns_sd::ServiceEvent::ServiceResolved(info) => {
                        println!("🎉 [mDNS] Service resolved!");
                        println!("   Full name: {}", info.get_fullname());
                        println!("   Hostname: {}", info.get_hostname());
                        println!("   Port: {}", info.get_port());
                        println!("   Addresses: {:?}", info.get_addresses());
                        println!("   Properties: {:?}", info.get_properties());

                        if let Some(device) = Self::parse_service_info(&info) {
                            println!("✅ [mDNS] Parsed device: {} ({})", device.device_name, device.device_id);
                            let mut devices = discovered.lock().await;
                            devices.insert(device.device_id.clone(), device);
                            println!("📊 [mDNS] Total discovered devices: {}", devices.len());
                        } else {
                            println!("⚠️  [mDNS] Failed to parse service info");
                        }
                    }
                    mdns_sd::ServiceEvent::ServiceRemoved(_, full_name) => {
                        println!("👋 [mDNS] Service removed: {}", full_name);
                        // Extract device ID from full name and remove from list
                        let mut devices = discovered.lock().await;
                        let before = devices.len();
                        devices.retain(|_, d| !full_name.contains(&d.device_id[..8]));
                        let after = devices.len();
                        if before != after {
                            println!("🗑️  [mDNS] Removed device. Count: {} -> {}", before, after);
                        }
                    }
                    mdns_sd::ServiceEvent::SearchStarted(_) => {
                        println!("🚀 [mDNS] Search started");
                    }
                    mdns_sd::ServiceEvent::SearchStopped(_) => {
                        println!("🛑 [mDNS] Search stopped");
                    }
                    _ => {
                        println!("ℹ️  [mDNS] Other event: {:?}", event);
                    }
                }
            }
            println!("⚠️  [mDNS] Background listener task ended");
        });

        Ok(())
    }

    /// Stop browsing for devices
    pub async fn stop_browsing(&self) -> Result<(), String> {
        // Browse receiver will be dropped when MdnsDiscovery is dropped
        Ok(())
    }

    /// Parse ServiceInfo into DiscoveredDevice
    fn parse_service_info(info: &ServiceInfo) -> Option<DiscoveredDevice> {
        let properties = info.get_properties();

        println!("🔍 [mDNS] Parsing service info...");
        println!("   Available properties: {:?}", properties);

        let device_id = match properties.get("device_id") {
            Some(id) => {
                let id_str = id.to_string();
                println!("   ✅ device_id: {}", id_str);
                id_str
            }
            None => {
                println!("   ❌ Missing device_id property");
                return None;
            }
        };

        let device_name = match properties.get("device_name") {
            Some(name) => {
                let name_str = name.to_string();
                println!("   ✅ device_name: {}", name_str);
                name_str
            }
            None => {
                println!("   ❌ Missing device_name property");
                return None;
            }
        };

        let version = match properties.get("version") {
            Some(ver) => {
                let ver_str = ver.to_string();
                println!("   ✅ version: {}", ver_str);
                ver_str
            }
            None => {
                println!("   ⚠️  Missing version property, using default");
                "unknown".to_string()
            }
        };

        let addresses = info.get_addresses();
        println!("   Available addresses: {:?}", addresses);

        // Filter addresses: prefer IPv4, avoid link-local IPv6, avoid Tailscale
        let filtered_addresses: Vec<_> = addresses.iter()
            .filter(|addr| !is_link_local(addr) && !is_tailscale(addr))
            .collect();

        println!("   Filtered addresses (excluding link-local and Tailscale): {:?}", filtered_addresses);

        // Prefer IPv4 addresses
        let preferred_address = filtered_addresses.iter()
            .find(|addr| matches!(addr, IpAddr::V4(_)))
            .or_else(|| filtered_addresses.first())
            .copied();

        let ip_address = match preferred_address {
            Some(addr) => {
                let addr_str = addr.to_string();
                println!("   ✅ Selected IP address: {}", addr_str);
                addr_str
            }
            None => {
                println!("   ❌ No usable IP addresses found (all were link-local or Tailscale)");
                return None;
            }
        };

        let port = info.get_port();
        println!("   ✅ Port: {}", port);

        let device = DiscoveredDevice {
            device_id,
            device_name,
            ip_address,
            port,
            version: version.clone(),
            app_version: version,
            is_trusted: false, // Will be set by MdnsSyncManager
        };

        println!("✅ [mDNS] Successfully parsed device");
        Some(device)
    }

    /// Get list of currently discovered devices
    pub async fn get_discovered_devices(&self) -> Result<Vec<DiscoveredDevice>, String> {
        let devices = self.discovered_devices.lock().await;
        let device_list: Vec<DiscoveredDevice> = devices.values().cloned().collect();
        println!("📋 [mDNS] get_discovered_devices called: {} devices in list", device_list.len());
        for device in &device_list {
            println!("   - {} ({}) at {}:{}", device.device_name, device.device_id, device.ip_address, device.port);
        }
        Ok(device_list)
    }

    /// Get this device's ID
    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    /// Get this device's name
    pub fn device_name(&self) -> &str {
        &self.device_name
    }
}
