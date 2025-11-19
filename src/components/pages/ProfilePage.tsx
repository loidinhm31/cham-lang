import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, Upload, Download, Key } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { TopBar } from '../molecules';
import { Card, Button, Input } from '../atoms';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [isConfigured, setIsConfigured] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [backupInfo, setBackupInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkGDriveConfig();
  }, []);

  const checkGDriveConfig = async () => {
    try {
      const configured = await invoke<boolean>('is_gdrive_configured');
      setIsConfigured(configured);

      if (configured) {
        loadBackupInfo();
      }
    } catch (error) {
      console.error('Failed to check Google Drive config:', error);
    }
  };

  const loadBackupInfo = async () => {
    try {
      const info = await invoke<string | null>('get_gdrive_backup_info');
      setBackupInfo(info);
    } catch (error) {
      console.error('Failed to load backup info:', error);
    }
  };

  const handleSetToken = async () => {
    if (!accessToken.trim()) {
      alert('Please enter an access token');
      return;
    }

    try {
      setLoading(true);
      await invoke('set_gdrive_token', { accessToken: accessToken.trim() });
      setIsConfigured(true);
      alert('Google Drive configured successfully!');
      setAccessToken('');
      loadBackupInfo();
    } catch (error) {
      console.error('Failed to set token:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!confirm('Backup your database to Google Drive?')) return;

    try {
      setLoading(true);
      const result = await invoke<string>('backup_to_gdrive');
      alert(result);
      loadBackupInfo();
    } catch (error) {
      console.error('Backup failed:', error);
      alert(`Backup failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('⚠️  WARNING: This will replace your current data with the backup from Google Drive. Continue?')) return;

    try {
      setLoading(true);
      const result = await invoke<string>('restore_from_gdrive');
      alert(result + '\n\nPlease restart the application to see the restored data.');
    } catch (error) {
      console.error('Restore failed:', error);
      alert(`Restore failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <TopBar title={t('profile.title')} showBack={false} />

      {/* Google Drive Sync Section */}
      <Card variant="glass">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <Cloud className="w-6 h-6 text-green-600" />
              ) : (
                <CloudOff className="w-6 h-6 text-gray-400" />
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Google Drive Sync
                </h3>
                <p className="text-sm text-gray-600">
                  {isConfigured ? 'Connected' : 'Not configured'}
                </p>
              </div>
            </div>
          </div>

          {!isConfigured && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                To enable Google Drive sync, you need to provide an access token.
                <br />
                <a
                  href="https://developers.google.com/oauthplayground/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Get your token from OAuth 2.0 Playground
                </a>
              </p>
              <p className="text-xs text-gray-500">
                Required scope: <code className="bg-gray-100 px-1 py-0.5 rounded">https://www.googleapis.com/auth/drive.file</code>
              </p>
              <Input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your Google OAuth access token here"
                type="password"
              />
              <Button
                onClick={handleSetToken}
                disabled={loading || !accessToken.trim()}
                variant="primary"
                fullWidth
                icon={Key}
              >
                {loading ? 'Setting up...' : 'Configure Google Drive'}
              </Button>
            </div>
          )}

          {isConfigured && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {backupInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Backup found on Google Drive
                  </p>
                  <pre className="text-xs text-green-700 mt-1 overflow-auto">
                    {backupInfo}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleBackup}
                  disabled={loading}
                  variant="primary"
                  icon={Upload}
                >
                  {loading ? 'Backing up...' : 'Backup Now'}
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={loading}
                  variant="secondary"
                  icon={Download}
                >
                  {loading ? 'Restoring...' : 'Restore'}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Last sync info will appear above after successful backup
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* App Info Section */}
      <Card variant="glass">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-800">App Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Version:</strong> 0.1.0</p>
            <p><strong>Mode:</strong> Local-first (offline)</p>
            <p><strong>Database:</strong> SQLite</p>
            <p><strong>Sync:</strong> Google Drive (optional)</p>
          </div>
        </div>
      </Card>

      {/* Instructions Card */}
      <Card variant="glass">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-800">How to use Google Drive Sync</h3>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Visit <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OAuth 2.0 Playground</a></li>
            <li>Click on ⚙️ settings icon and check "Use your own OAuth credentials"</li>
            <li>Enter your OAuth Client ID and Secret (create one in Google Cloud Console if needed)</li>
            <li>In "Step 1", select "Drive API v3" → "https://www.googleapis.com/auth/drive.file"</li>
            <li>Click "Authorize APIs" and allow access</li>
            <li>In "Step 2", click "Exchange authorization code for tokens"</li>
            <li>Copy the "Access token" and paste it above</li>
          </ol>
          <p className="text-xs text-amber-600">
            ⚠️ Note: Access tokens expire after 1 hour. You'll need to refresh them periodically.
          </p>
        </div>
      </Card>
    </div>
  );
};
