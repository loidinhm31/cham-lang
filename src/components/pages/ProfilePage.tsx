import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, Database, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TopBar } from '../molecules';
import { Card, Button, Input, Select } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import type { UserPreferences } from '../../types/vocabulary';

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [connectionString, setConnectionString] = useState('mongodb://localhost:27017');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
    checkConnection();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await VocabularyService.getPreferences(user.user_id);
      if (prefs) {
        setPreferences(prefs);
        i18n.changeLanguage(prefs.interface_language);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const checkConnection = async () => {
    try {
      const connected = await VocabularyService.isDatabaseConnected();
      setIsConnected(connected);
    } catch (error) {
      console.error('Failed to check connection:', error);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      await VocabularyService.connectDatabase(connectionString);
      setIsConnected(true);
      alert(t('messages.saveSuccess'));
    } catch (error) {
      console.error('Connection failed:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await VocabularyService.disconnectDatabase();
      setIsConnected(false);
      alert(t('messages.saveSuccess'));
    } catch (error) {
      console.error('Disconnect failed:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    if (!user) return;

    try {
      i18n.changeLanguage(language);

      const now = new Date().toISOString();
      const updatedPrefs: UserPreferences = preferences || {
        user_id: user.user_id,
        interface_language: language,
        native_language: 'vi',
        learning_languages: ['en'],
        theme: 'chameleon',
        created_at: now,
        updated_at: now,
      };

      updatedPrefs.interface_language = language;
      updatedPrefs.updated_at = now;

      await VocabularyService.savePreferences(updatedPrefs);
      setPreferences(updatedPrefs);
      alert(t('messages.saveSuccess'));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert(t('messages.error'));
    }
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
  ];

  return (
    <>
      <TopBar title={t('nav.profile')} showBack={false} />

      <div className="px-4 pt-6 space-y-6">
        {/* Profile Header */}
        <Card variant="gradient">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{user?.username}</h2>
            <p className="text-white/90 mb-1">{user?.email}</p>
            <p className="text-white/70 text-sm">{t('app.tagline')}</p>
          </div>

          <div className="mt-6">
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {t('auth.logout')}
            </Button>
          </div>
        </Card>

        {/* Language Settings */}
        <Card variant="glass">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-teal-600" />
            <h3 className="text-xl font-bold text-gray-800">{t('settings.language')}</h3>
          </div>

          <Select
            label={t('settings.language')}
            options={languageOptions}
            value={preferences?.interface_language || 'en'}
            onChange={(e) => handleLanguageChange(e.target.value)}
          />
        </Card>

        {/* Database Connection */}
        <Card variant="glass">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-teal-600" />
            <h3 className="text-xl font-bold text-gray-800">{t('settings.database')}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/40 rounded-2xl">
              <span className="font-semibold text-gray-700">{t('settings.connected')}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                isConnected
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-400 text-white'
              }`}>
                {isConnected ? '✓' : '✗'}
              </span>
            </div>

            <Input
              label={t('settings.connectionString')}
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder="mongodb://localhost:27017"
            />

            <div className="flex gap-3">
              {!isConnected ? (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleConnect}
                  disabled={loading}
                >
                  {loading ? t('messages.connecting') : t('settings.connect')}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  {t('settings.disconnect')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* App Info */}
        <Card variant="glass">
          <div className="text-center">
            <div className="text-4xl mb-3">🦎</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{t('app.name')}</h3>
            <p className="text-sm text-gray-600">Version 1.0.0</p>
            <p className="text-xs text-gray-500 mt-2">{t('app.tagline')}</p>
          </div>
        </Card>
      </div>
    </>
  );
};
