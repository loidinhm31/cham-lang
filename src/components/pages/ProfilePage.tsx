import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, Upload, Download, LogIn, LogOut, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { signIn, signOut, refreshToken } from '@choochmeque/tauri-plugin-google-auth-api';
import { TopBar } from '../molecules';
import { Card, Button } from '../atoms';
import { useSyncNotification } from '../../contexts';

// OAuth configuration - these should be environment variables in production
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { hasSyncNotification, checkSyncStatus, dismissNotification } = useSyncNotification();
  const [isConfigured, setIsConfigured] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [backupInfo, setBackupInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkGDriveConfig();

    // Dismiss notification when user first visits profile page
    // Only dismiss on mount, not when hasSyncNotification changes
    if (hasSyncNotification) {
      dismissNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const checkGDriveConfig = () => {
    try {
      const storedToken = localStorage.getItem('gdrive_access_token');
      const storedEmail = localStorage.getItem('gdrive_user_email');

      if (storedToken) {
        setAccessToken(storedToken);
        setUserEmail(storedEmail || '');
        setIsConfigured(true);
        loadBackupInfo(storedToken);
      }
    } catch (error) {
      console.error('Failed to check Google Drive config:', error);
    }
  };

  const loadBackupInfo = async (token: string) => {
    try {
      const info = await invoke<string>('get_gdrive_backup_info', {
        accessToken: token
      });
      setBackupInfo(info);
    } catch (error) {
      console.error('Failed to load backup info:', error);
      setBackupInfo(null);
    }
  };

  const handleTokenRefresh = async (): Promise<string | null> => {
    try {
      const response = await refreshToken();

      // Update stored token
      localStorage.setItem('gdrive_access_token', response.accessToken);
      setAccessToken(response.accessToken);

      return response.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      alert('Session expired. Please sign in again.');

      // Clear tokens and sign out
      localStorage.removeItem('gdrive_access_token');
      localStorage.removeItem('gdrive_user_email');
      setAccessToken('');
      setUserEmail('');
      setIsConfigured(false);

      return null;
    }
  };

  const handleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }

    try {
      setLoading(true);

      const response = await signIn({
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive.file'
        ],
      });

      console.log('Sign in successful:', response);

      // Store tokens
      localStorage.setItem('gdrive_access_token', response.accessToken);
      if (response.idToken) {
        // Parse ID token to get email (basic parsing, in production use a proper JWT library)
        try {
          const payload = JSON.parse(atob(response.idToken.split('.')[1]));
          if (payload.email) {
            localStorage.setItem('gdrive_user_email', payload.email);
            setUserEmail(payload.email);
          }
        } catch (e) {
          console.error('Failed to parse ID token:', e);
        }
      }

      setAccessToken(response.accessToken);
      setIsConfigured(true);
      alert('Successfully signed in with Google!');
      loadBackupInfo(response.accessToken);
    } catch (error) {
      console.error('Sign in failed:', error);
      alert(`Sign in failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();

      // Clear stored tokens
      localStorage.removeItem('gdrive_access_token');
      localStorage.removeItem('gdrive_user_email');

      setAccessToken('');
      setUserEmail('');
      setIsConfigured(false);
      setBackupInfo(null);
      alert('Signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      alert(`Sign out failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!confirm('Backup your database to Google Drive?')) return;

    try {
      setLoading(true);
      let currentToken = accessToken;

      try {
        const result = await invoke<string>('backup_to_gdrive', {
          accessToken: currentToken
        });
        alert(result);
        loadBackupInfo(currentToken);
        // Recheck sync status after backup
        await checkSyncStatus();
      } catch (error) {
        const errorStr = String(error);

        // Check if error is due to expired token (401)
        if (errorStr.includes('401') || errorStr.includes('UNAUTHENTICATED') || errorStr.includes('Invalid Credentials')) {
          console.log('Token expired, refreshing...');
          const newToken = await handleTokenRefresh();

          if (newToken) {
            // Retry with new token
            const result = await invoke<string>('backup_to_gdrive', {
              accessToken: newToken
            });
            alert(result);
            loadBackupInfo(newToken);
            await checkSyncStatus();
          }
        } else {
          throw error;
        }
      }
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
      let currentToken = accessToken;

      try {
        const result = await invoke<string>('restore_from_gdrive', {
          accessToken: currentToken
        });
        alert(result + '\n\nPlease restart the application to see the restored data.');
        // Recheck sync status after restore
        await checkSyncStatus();
      } catch (error) {
        const errorStr = String(error);

        // Check if error is due to expired token (401)
        if (errorStr.includes('401') || errorStr.includes('UNAUTHENTICATED') || errorStr.includes('Invalid Credentials')) {
          console.log('Token expired, refreshing...');
          const newToken = await handleTokenRefresh();

          if (newToken) {
            // Retry with new token
            const result = await invoke<string>('restore_from_gdrive', {
              accessToken: newToken
            });
            alert(result + '\n\nPlease restart the application to see the restored data.');
            await checkSyncStatus();
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Restore failed:', error);
      alert(`Restore failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('🚨 DANGER: This will PERMANENTLY DELETE all local data!\n\nThis action cannot be undone. Make sure you have a backup on Google Drive before proceeding.\n\nAre you absolutely sure?')) return;

    // Second confirmation
    if (!confirm('Final confirmation: Delete all local data?')) return;

    try {
      setLoading(true);
      const result = await invoke<string>('clear_local_database');
      alert(result);
    } catch (error) {
      console.error('Clear database failed:', error);
      alert(`Clear database failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <TopBar title={t('nav.profile')} showBack={false} />

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
                  {isConfigured ? `Connected as ${userEmail}` : 'Not connected'}
                </p>
              </div>
            </div>
            {isConfigured && (
              <Button
                onClick={handleSignOut}
                disabled={loading}
                variant="secondary"
                icon={LogOut}
              >
                Sign Out
              </Button>
            )}
          </div>

          {!isConfigured && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Sign in with your Google account to automatically sync your database to Google Drive.
              </p>
              <p className="text-xs text-gray-500">
                This will request access to create and manage files in your Google Drive (drive.file scope).
              </p>
              <Button
                onClick={handleSignIn}
                disabled={loading}
                variant="primary"
                fullWidth
                icon={LogIn}
              >
                {loading ? 'Signing in...' : 'Sign in with Google'}
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
                  {loading ? 'Processing...' : 'Backup Now'}
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={loading}
                  variant="secondary"
                  icon={Download}
                >
                  {loading ? 'Processing...' : 'Restore'}
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

      {/* Danger Zone */}
      <Card variant="glass">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
            <p className="text-sm text-gray-600 mt-1">
              Irreversible and destructive actions
            </p>
          </div>

          <div className="border-t border-red-200 pt-4 space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Clear Local Database
              </p>
              <p className="text-xs text-red-700 mt-1">
                This will permanently delete all your local data including collections, vocabularies, and practice history. Make sure you have a backup on Google Drive before proceeding. The database will be cleared immediately and you can start fresh or restore from backup.
              </p>
            </div>

            <Button
              onClick={handleClearDatabase}
              disabled={loading}
              variant="secondary"
              fullWidth
              icon={Trash2}
            >
              {loading ? 'Clearing...' : 'Clear Local Database'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Recommended workflow: Backup → Clear → Restore
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
