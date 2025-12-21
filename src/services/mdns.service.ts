import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export interface DiscoveredDevice {
  device_id: string;
  device_name: string;
  ip_address: string;
  port: number;
  version: string;
  app_version: string;
  is_trusted: boolean;
}

export interface TrustedDevice {
  id: string;
  device_id: string;
  device_name: string;
  first_paired_at: number;
  last_synced_at?: number;
  sync_count: number;
  created_at: number;
  updated_at: number;
}

export interface SyncProgress {
  session_id: string;
  total_bytes: number;
  transferred_bytes: number;
  percentage: number;
  speed_bps: number;
  estimated_seconds_remaining: number;
}

export interface SyncHistoryEntry {
  id: string;
  device_id: string;
  device_name?: string;
  direction: "upload" | "download";
  bytes_transferred: number;
  duration_ms: number;
  status: "success" | "failed" | "cancelled";
  error_message?: string;
  local_version_before: number;
  local_version_after: number;
  synced_at: number;
}

export interface IncomingPairingRequest {
  device_id: string;
  device_name: string;
  ip_address: string;
  port: number;
  timestamp: number;
}

export class MdnsService {
  /**
   * Start mDNS discovery
   */
  static async startDiscovery(): Promise<void> {
    return invoke("start_mdns_discovery");
  }

  /**
   * Stop mDNS discovery
   */
  static async stopDiscovery(): Promise<void> {
    return invoke("stop_mdns_discovery");
  }

  /**
   * Get list of discovered devices
   */
  static async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
    return invoke("get_discovered_devices");
  }

  /**
   * Initiate pairing with a device (sends pairing request to target device)
   * Returns the PIN that should be displayed to the user
   */
  static async initiatePairing(
    targetDeviceId: string,
    targetDeviceName: string,
    targetIp: string,
    targetPort: number,
  ): Promise<string> {
    return invoke("initiate_pairing", { targetDeviceId, targetDeviceName, targetIp, targetPort });
  }

  /**
   * Complete pairing after the other device confirmed (this device initiated pairing)
   */
  static async completePairing(
    targetDeviceId: string,
    targetDeviceName: string,
    pin: string,
  ): Promise<TrustedDevice> {
    return invoke("complete_pairing", { targetDeviceId, targetDeviceName, pin });
  }

  /**
   * Respond to an incoming pairing request by entering the PIN
   */
  static async respondToPairing(
    deviceId: string,
    deviceName: string,
    pin: string,
  ): Promise<TrustedDevice> {
    return invoke("respond_to_pairing", { deviceId, deviceName, pin });
  }

  /**
   * Confirm pairing with a device using PIN (legacy - kept for backward compatibility)
   */
  static async confirmPairing(
    deviceId: string,
    pin: string,
  ): Promise<TrustedDevice> {
    return invoke("confirm_pairing", { deviceId, pin });
  }

  /**
   * Get list of trusted (paired) devices
   */
  static async getTrustedDevices(): Promise<TrustedDevice[]> {
    return invoke("get_trusted_devices");
  }

  /**
   * Remove a trusted device (unpair)
   */
  static async removeTrustedDevice(deviceId: string): Promise<void> {
    return invoke("remove_trusted_device", { deviceId });
  }

  /**
   * Sync with a trusted device
   */
  static async syncWithDevice(deviceId: string): Promise<string> {
    return invoke("sync_with_device", { deviceId });
  }

  /**
   * Get sync history
   */
  static async getSyncHistory(
    deviceId?: string,
    limit?: number,
  ): Promise<SyncHistoryEntry[]> {
    return invoke("get_sync_history", { deviceId, limit });
  }

  /**
   * Cancel an ongoing sync session
   */
  static async cancelSync(sessionId: string): Promise<void> {
    return invoke("cancel_sync", { sessionId });
  }

  /**
   * Get mDNS diagnostics information for troubleshooting
   */
  static async getDiagnostics(): Promise<any> {
    return invoke("get_mdns_diagnostics");
  }

  /**
   * Listen for sync progress events
   */
  static async onSyncProgress(
    callback: (progress: SyncProgress) => void,
  ): Promise<UnlistenFn> {
    return listen<SyncProgress>("sync-progress", (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listen for device discovered events
   */
  static async onDeviceDiscovered(
    callback: (device: DiscoveredDevice) => void,
  ): Promise<UnlistenFn> {
    return listen<DiscoveredDevice>("device-discovered", (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listen for device lost events
   */
  static async onDeviceLost(
    callback: (deviceId: string) => void,
  ): Promise<UnlistenFn> {
    return listen<string>("device-lost", (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listen for incoming pairing requests
   */
  static async onPairingRequest(
    callback: (request: IncomingPairingRequest) => void,
  ): Promise<UnlistenFn> {
    return listen<IncomingPairingRequest>("pairing-request", (event) => {
      callback(event.payload);
    });
  }
}
