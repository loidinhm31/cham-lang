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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 sm:pb-6 pb-13">
      <div className="grid grid-cols-4 gap-2 bg-[var(--glass-bg)] backdrop-blur-md rounded-[28px] border-[3px] border-[var(--color-border-light)] shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.12),inset_0_-2px_4px_rgba(0,0,0,0.05)] p-3 transition-colors duration-300">
        {navItems.map((item) => {
          const isActive = location.pathname === to(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-[3px] transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-indigo-700 shadow-[0_4px_0_rgba(79,70,229,0.3),0_2px_8px_rgba(79,70,229,0.2),inset_0_-2px_3px_rgba(0,0,0,0.1)]"
                  : "bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-white/20 active:shadow-none"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
