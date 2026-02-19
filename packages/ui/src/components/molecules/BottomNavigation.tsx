import React from "react";
import { Award, BookOpen, Library, LucideIcon, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
}

export const BottomNavigation: React.FC = () => {
  const { t } = useTranslation();
  const { to, navigate } = useNav();
  const location = useLocation();

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

  // Check if the current path matches or starts with the nav item path
  const isPathActive = (navPath: string) => {
    const fullPath = to(navPath);
    if (navPath === "/") {
      return location.pathname === fullPath;
    }
    return (
      location.pathname === fullPath || location.pathname.startsWith(fullPath)
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4 md:hidden"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)",
      }}
    >
      <div className="grid grid-cols-4 gap-2 bg-(--glass-bg) backdrop-blur-md rounded-[28px] border-[3px] border-(--color-border-light) shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.12),inset_0_-2px_4px_rgba(0,0,0,0.05)] p-3 transition-colors duration-300">
        {navItems.map((item) => {
          const isActive = isPathActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-[3px] transition-all duration-200 ${
                isActive
                  ? "btn-indigo text-white border-indigo-700 shadow-[0_4px_0_rgba(79,70,229,0.3),0_2px_8px_rgba(79,70,229,0.2),inset_0_-2px_3px_rgba(0,0,0,0.1)]"
                  : "bg-transparent text-(--color-text-secondary) border-transparent hover:bg-white/20 active:shadow-none"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
