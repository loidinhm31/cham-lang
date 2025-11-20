import React from 'react';
import { Menu, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncNotification } from '../../contexts';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title = 'Chameleon',
  showBack = false,
  showMenu = true,
  showNotifications = true,
  onMenuClick,
}) => {
  const navigate = useNavigate();
  const { hasSyncNotification } = useSyncNotification();

  const handleNotificationClick = () => {
    navigate('/profile');
  };

  return (
    <div className="sticky top-0 z-40 pt-safe">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between bg-white/60 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/50 rounded-xl transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-800" />
            </button>
          ) : showMenu ? (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-white/50 rounded-xl transition"
            >
              <Menu className="w-6 h-6 text-gray-800" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <h1 className="text-xl font-bold text-gray-800">{title}</h1>

          {showNotifications ? (
            <button
              onClick={handleNotificationClick}
              className="p-2 hover:bg-white/50 rounded-xl transition relative"
              title={hasSyncNotification ? "Cloud backup version is different from local" : "Notifications"}
            >
              <Bell className={`w-6 h-6 ${hasSyncNotification ? 'text-blue-600' : 'text-gray-800'}`} />
              {hasSyncNotification && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              )}
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>
    </div>
  );
};
