import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, UserMinus } from 'lucide-react';
import { Input, Button, Card } from '../atoms';
import type { Collection } from '../../types/collection';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
  onShare: (username: string) => Promise<void>;
  onUnshare: (userId: string) => Promise<void>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  collection,
  onShare,
  onUnshare,
}) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      setLoading(true);
      await onShare(username);
      setUsername('');
    } catch (error) {
      console.error('Failed to share collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    try {
      setLoading(true);
      await onUnshare(userId);
    } catch (error) {
      console.error('Failed to unshare collection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {t('collections.share')} - {collection.name}
        </h2>
        <p className="text-gray-600 mb-6">{t('collections.shareDescription')}</p>

        <form onSubmit={handleShare} className="mb-6">
          <div className="flex gap-2">
            <Input
              placeholder={t('collections.shareWith')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary" disabled={loading || !username.trim()}>
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </form>

        {collection.shared_with && collection.shared_with.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {t('collections.sharedWith')} ({collection.shared_with.length})
            </h3>
            <div className="space-y-2">
              {collection.shared_with.map((userId) => (
                <div
                  key={userId}
                  className="flex items-center justify-between p-3 bg-white/40 rounded-2xl"
                >
                  <span className="text-gray-700 font-medium">{userId}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleUnshare(userId)}
                    disabled={loading}
                    className="flex items-center gap-1"
                  >
                    <UserMinus className="w-4 h-4" />
                    {t('collections.remove')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!collection.shared_with || collection.shared_with.length === 0) && (
          <div className="text-center py-6 text-gray-500">
            {t('collections.notSharedYet')}
          </div>
        )}
      </Card>
    </div>
  );
};
