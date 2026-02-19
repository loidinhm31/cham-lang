import React from "react";
import { ArrowLeft, Bell, Menu, Palette } from "lucide-react";
import { useNav } from "@cham-lang/ui/hooks";
import { useSyncNotification } from "@cham-lang/ui/contexts";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  onMenuClick?: () => void;
  backTo?: string;
  onBackClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title = "Cham Lang",
  showBack = false,
  showMenu = true,
  showNotifications = true,
  onMenuClick,
  backTo,
  onBackClick,
}) => {
  const { navigate } = useNav();
  const { hasSyncNotification } = useSyncNotification();

  const handleNotificationClick = () => {
    navigate("/settings");
  };

  const handleThemePreviewClick = () => {
    navigate("/settings/theme-preview");
  };

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="sticky top-0 z-40 pt-safe px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4">
      <div className="flex items-center justify-between bg-(--glass-bg) backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-(--color-border-light) transition-colors duration-300">
        {showBack ? (
          <button
            onClick={handleBackClick}
            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition text-(--color-text-primary)"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : showMenu ? (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition text-(--color-text-primary)"
          >
            <Menu className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <h1 className="text-xl font-bold text-(--color-text-primary)">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleThemePreviewClick}
            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition text-(--color-text-primary)"
            title="Theme Preview"
          >
            <Palette className="w-6 h-6" />
          </button>

          {showNotifications ? (
            <button
              onClick={handleNotificationClick}
              className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition relative text-(--color-text-primary)"
              title={
                hasSyncNotification
                  ? "Cloud backup version is different from local"
                  : "Notifications"
              }
            >
              <Bell
                className={`w-6 h-6 ${hasSyncNotification ? "text-blue-600" : ""}`}
              />
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
