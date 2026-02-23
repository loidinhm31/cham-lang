import React from "react";
import {
  Award,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Library,
  LucideIcon,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";
import { useSyncNotification } from "@cham-lang/ui/contexts";

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useTranslation();
  const { to, navigate } = useNav();
  const { hasSyncNotification } = useSyncNotification();

  const navItems: NavItem[] = [
    { id: "learn", icon: BookOpen, label: t("nav.learn"), path: "/" },
    {
      id: "collections",
      icon: Library,
      label: t("nav.collections"),
      path: "/collections",
    },
    {
      id: "progress",
      icon: Award,
      label: t("nav.progress"),
      path: "/progress",
    },
    {
      id: "settings",
      icon: Settings,
      label: t("settings.title"),
      path: "/settings",
    },
  ];

  const handleNotificationClick = () => {
    navigate("/settings");
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col border-r transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRightColor: "var(--color-border-light)",
        boxShadow: "4px 0 20px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Brand */}
      <div
        className={`flex items-center gap-3 py-5 border-b transition-all duration-300 ${
          isCollapsed ? "px-3 justify-center" : "px-6"
        }`}
        style={{ borderBottomColor: "var(--color-border-light)" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "#6366f1",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
          }}
        >
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-(--color-text-primary) whitespace-nowrap">
              Cham Lang
            </h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <NavLink
                  to={to(item.path)}
                  end={item.path === "/"}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 py-3 rounded-xl transition-all duration-200 group ${
                      isCollapsed ? "px-0 justify-center" : "px-4"
                    } ${
                      isActive
                        ? "btn-indigo text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
                        : "text-(--color-text-secondary) hover:bg-white/20"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-all ${
                          isActive
                            ? "stroke-[2.5]"
                            : "stroke-2 group-hover:stroke-[2.5]"
                        }`}
                      />
                      {!isCollapsed && (
                        <>
                          <span
                            className={`text-sm whitespace-nowrap ${
                              isActive ? "font-bold" : "font-medium"
                            }`}
                          >
                            {item.label}
                          </span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white" />
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="mx-3 mb-3 p-2 rounded-lg transition-all hover:bg-white/20 flex items-center justify-center text-(--color-text-secondary)"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* Sync Status Footer */}
      <div
        className={`py-4 border-t ${isCollapsed ? "px-2" : "px-4"}`}
        style={{ borderTopColor: "var(--color-border-light)" }}
      >
        <button
          onClick={handleNotificationClick}
          title={
            hasSyncNotification
              ? "Cloud backup version is different from local"
              : "Notifications"
          }
          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-white/20 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="relative flex-shrink-0">
            <Bell
              className={`w-5 h-5 ${
                hasSyncNotification
                  ? "text-blue-500"
                  : "text-(--color-text-secondary)"
              }`}
            />
            {hasSyncNotification && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          {!isCollapsed && (
            <span
              className={`text-sm font-medium ${
                hasSyncNotification
                  ? "text-blue-500"
                  : "text-(--color-text-secondary)"
              }`}
            >
              {hasSyncNotification ? "Sync available" : "Up to date"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
