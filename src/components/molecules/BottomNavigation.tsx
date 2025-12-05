import React from "react";
import { Award, BookOpen, Library, LucideIcon, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
}

export const BottomNavigation: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    { id: "profile", icon: User, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-4 gap-2 bg-white rounded-[28px] border-[3px] border-gray-300 shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.12),inset_0_-2px_4px_rgba(0,0,0,0.05)] p-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-[3px] transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-indigo-700 shadow-[0_4px_0_rgba(79,70,229,0.3),0_2px_8px_rgba(79,70,229,0.2),inset_0_-2px_3px_rgba(0,0,0,0.1)]"
                    : "bg-gray-50 text-gray-600 border-gray-200 shadow-[0_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-100 hover:text-gray-800 active:shadow-[0_1px_0_rgba(0,0,0,0.05)]"
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
