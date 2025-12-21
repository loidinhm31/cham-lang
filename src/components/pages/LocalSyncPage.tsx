import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, RefreshCw, Plus, Trash2, Check, X } from "lucide-react";
import { TopBar } from "@/components/molecules";
import { MdnsService, DiscoveredDevice, TrustedDevice, SyncHistoryEntry, IncomingPairingRequest } from "@/services";
import { useDialog } from "@/contexts";
import {Button, Card} from "@/components/atoms";

export const LocalSyncPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialog();

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🎬 [UI] LocalSyncPage mounted");
    loadTrustedDevices();
    loadSyncHistory();

    // Listen for incoming pairing requests
    let unlistenPairingRequest: (() => void) | null = null;

    MdnsService.onPairingRequest(async (request: IncomingPairingRequest) => {
      console.log("📨 [UI] Received pairing request:", request);
      await handleIncomingPairingRequest(request);
    }).then((unlisten) => {
      unlistenPairingRequest = unlisten;
    });

    return () => {
      console.log("👋 [UI] LocalSyncPage unmounted");
      if (unlistenPairingRequest) {
        unlistenPairingRequest();
      }
    };
  }, []);

  const loadTrustedDevices = async () => {
    try {
      const devices = await MdnsService.getTrustedDevices();
      setTrustedDevices(devices);
    } catch (error) {
      console.error("Failed to load trusted devices:", error);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const history = await MdnsService.getSyncHistory(undefined, 20);
      setSyncHistory(history);
    } catch (error) {
      console.error("Failed to load sync history:", error);
    }
  };

  const handleStartDiscovery = async () => {
    try {
      console.log("🚀 [UI] Starting discovery...");
      setLoading(true);

      await MdnsService.startDiscovery();
      console.log("✅ [UI] Discovery started successfully");
      setIsDiscovering(true);

      // Poll for discovered devices
      console.log("🔄 [UI] Starting polling for devices every 2 seconds");
      const interval = setInterval(async () => {
        try {
          console.log("📡 [UI] Polling for devices...");
          const devices = await MdnsService.getDiscoveredDevices();
          console.log(`📊 [UI] Received ${devices.length} devices:`, devices);
          setDiscoveredDevices(devices);
        } catch (error) {
          console.error("❌ [UI] Failed to get discovered devices:", error);
        }
      }, 2000);

      // Store interval ID for cleanup
      return () => {
        console.log("🛑 [UI] Clearing polling interval");
        clearInterval(interval);
      };
    } catch (error) {
      console.error("❌ [UI] Failed to start discovery:", error);
      await showAlert(String(error), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleStopDiscovery = async () => {
    try {
      await MdnsService.stopDiscovery();
      setIsDiscovering(false);
      setDiscoveredDevices([]);
    } catch (error) {
      await showAlert(String(error), { variant: "error" });
    }
  };

  const handleIncomingPairingRequest = async (request: IncomingPairingRequest) => {
    try {
      // Use browser prompt to get the PIN from user
      // In a production app, you'd want a custom dialog component
      const pin = prompt(
        `${t("sync.deviceWantsToPair") || "Device"} "${request.device_name}" ${t("sync.enterPinShown") || "wants to pair.\n\nEnter the 6-digit PIN shown on that device:"}`
      );

      if (pin && pin.trim().length === 6) {
        // Respond to the pairing request with the PIN
        await MdnsService.respondToPairing(request.device_id, request.device_name, pin.trim());
        await showAlert(
          `${t("sync.pairingSuccess") || "Successfully paired with"} ${request.device_name}`,
          { variant: "success" }
        );
        loadTrustedDevices();
      } else if (pin !== null) {
        // User entered something but it's not 6 digits
        await showAlert(
          t("sync.invalidPin") || "Invalid PIN. Must be 6 digits.",
          { variant: "error" }
        );
      }
      // If pin is null, user cancelled - do nothing
    } catch (error) {
      await showAlert(String(error), { variant: "error" });
    }
  };

  const handlePairDevice = async (deviceId: string, deviceName: string, ipAddress: string, port: number) => {
    try {
      // Initiate pairing - this sends the request and returns a PIN
      const pin = await MdnsService.initiatePairing(deviceId, deviceName, ipAddress, port);

      // Import dialog from tauri-plugin-dialog
      const { message } = await import("@tauri-apps/plugin-dialog");

      // Show the PIN to the user
      await message(
        `${t("sync.showPinToOther") || "Show this PIN to"} ${deviceName}:\n\n${pin}\n\n${t("sync.waitForOtherDevice") || "Wait for the other device to enter this PIN, then click OK."}`,
        {
          title: t("sync.pairingPin") || "Pairing PIN",
          kind: "info",
        }
      );

      // After user clicks OK (meaning the other device entered the PIN), complete the pairing
      await MdnsService.completePairing(deviceId, deviceName, pin);

      await showAlert(
        `${t("sync.pairingSuccess") || "Successfully paired with"} ${deviceName}`,
        { variant: "success" }
      );

      // Reload trusted devices to show the newly paired device
      loadTrustedDevices();
    } catch (error) {
      await showAlert(String(error), { variant: "error" });
    }
  };

  const handleSyncWithDevice = async (deviceId: string, deviceName: string) => {
    try {
      setLoading(true);
      await MdnsService.syncWithDevice(deviceId);
      await showAlert(
        `${t("sync.syncStarted") || "Sync started with"} ${deviceName}`,
        { variant: "success" }
      );

      // Reload history after sync
      loadSyncHistory();
    } catch (error) {
      await showAlert(String(error), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    const confirmed = await showConfirm(
      `${t("sync.confirmUnpair") || "Remove trusted device"} ${deviceName}?`
    );

    if (confirmed) {
      try {
        await MdnsService.removeTrustedDevice(deviceId);
        await showAlert(
          `${t("sync.deviceRemoved") || "Device removed"}`,
          { variant: "success" }
        );
        loadTrustedDevices();
      } catch (error) {
        await showAlert(String(error), { variant: "error" });
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <TopBar title={t("sync.localSync") || "Local Network Sync"} showBack={true} onBackClick={() => navigate(-1)} />

      <main className="flex-1 overflow-y-auto p-4">
        {/* Discovery Section */}
        <Card className="mb-4 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t("sync.discovery") || "Device Discovery"}
            </h2>
            <Button
              onClick={isDiscovering ? handleStopDiscovery : handleStartDiscovery}
              variant={isDiscovering ? "secondary" : "primary"}
              disabled={loading}
              icon={isDiscovering ? WifiOff : Wifi}
            >
              {isDiscovering
                ? t("sync.stopDiscovery") || "Stop"
                : t("sync.startDiscovery") || "Start Discovery"}
            </Button>
          </div>

          {isDiscovering && (
            <div className="space-y-2">
              {discoveredDevices.length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  {t("sync.searching") || "Searching for devices..."}
                </p>
              ) : (
                discoveredDevices.map((device) => (
                  <div
                    key={device.device_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{device.device_name}</p>
                      <p className="text-sm text-gray-500">{device.ip_address}</p>
                    </div>
                    {device.is_trusted ? (
                      <div className="flex items-center text-green-600">
                        <Check className="h-5 w-5" />
                        <span className="ml-1 text-sm">{t("sync.trusted") || "Trusted"}</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handlePairDevice(device.device_id, device.device_name, device.ip_address, device.port)}
                        variant="primary"
                        size="sm"
                        icon={Plus}
                      >
                        {t("sync.pair") || "Pair"}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Trusted Devices Section */}
        <Card className="mb-4 p-4">
          <h2 className="mb-4 text-lg font-semibold">
            {t("sync.trustedDevices") || "Trusted Devices"}
          </h2>

          {trustedDevices.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              {t("sync.noTrustedDevices") || "No trusted devices yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {trustedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{device.device_name}</p>
                    <p className="text-sm text-gray-500">
                      {t("sync.lastSynced") || "Last synced"}:{" "}
                      {device.last_synced_at
                        ? formatDate(device.last_synced_at)
                        : t("sync.never") || "Never"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t("sync.syncCount") || "Syncs"}: {device.sync_count}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSyncWithDevice(device.device_id, device.device_name)}
                      variant="primary"
                      size="sm"
                      disabled={loading}
                      icon={RefreshCw}
                    >
                      {t("sync.syncNow") || "Sync"}
                    </Button>
                    <Button
                      onClick={() => handleRemoveDevice(device.device_id, device.device_name)}
                      variant="secondary"
                      size="sm"
                      icon={Trash2}
                    >
                      {t("common.remove") || "Remove"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Sync History Section */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">
            {t("sync.history") || "Sync History"}
          </h2>

          {syncHistory.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              {t("sync.noHistory") || "No sync history"}
            </p>
          ) : (
            <div className="space-y-2">
              {syncHistory.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {entry.device_name || entry.device_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.direction === "upload" ? "↑" : "↓"}{" "}
                        {formatBytes(entry.bytes_transferred)} •{" "}
                        {(entry.duration_ms / 1000).toFixed(1)}s
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(entry.synced_at)}
                      </p>
                    </div>
                    <div>
                      {entry.status === "success" && (
                        <span className="flex items-center text-green-600">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      {entry.status === "failed" && (
                        <span className="flex items-center text-red-600" title={entry.error_message}>
                          <X className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
