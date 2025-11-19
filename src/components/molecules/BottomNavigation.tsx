import React from 'react';
import {Award, BookOpen, Library, LucideIcon, User} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useLocation, useNavigate} from 'react-router-dom';

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
    { id: 'learn', icon: BookOpen, label: t('nav.learn'), path: '/' },
    { id: 'collections', icon: Library, label: t('nav.collections'), path: '/collections' },
    { id: 'progress', icon: Award, label: t('nav.progress'), path: '/progress' },
    { id: 'profile', icon: User, label: t('nav.profile'), path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="grid grid-cols-4 gap-2 bg-white/60 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
