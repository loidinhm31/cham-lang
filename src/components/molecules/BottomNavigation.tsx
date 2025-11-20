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
      <div className="max-w-2xl mx-auto px-2 pb-12">
        <div className="grid grid-cols-4 gap-1 bg-white/75 backdrop-blur-md rounded-2xl border-t border-gray-200 shadow-lg">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
