import React from 'react';
import { BottomNavigation } from '../molecules';

interface MainLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

const FloatingBg = () => (
  <>
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(5deg); }
      }
    `}</style>
    <div className="absolute w-32 h-32 bg-cyan-400 opacity-20 rounded-lg top-10 left-10 rotate-12 animate-[float_4s_ease-in-out_infinite]" />
    <div className="absolute w-24 h-24 bg-amber-300 opacity-20 top-40 right-20 rounded-2xl animate-[float_3.5s_ease-in-out_0.5s_infinite]" />
    <div className="absolute w-28 h-28 bg-orange-400 opacity-20 bottom-20 left-1/4 rounded-xl rotate-45 animate-[float_4.5s_ease-in-out_1s_infinite]" />
    <div className="absolute w-20 h-20 bg-teal-500 opacity-20 bottom-40 right-1/3 rounded-lg animate-[float_3s_ease-in-out_1.5s_infinite]" />
  </>
);

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showBottomNav = true,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-200 via-cyan-100 to-teal-200 relative overflow-hidden">
      <FloatingBg />

      <div className="relative z-10 max-w-2xl mx-auto pb-32">
        {children}
      </div>

      {showBottomNav && <BottomNavigation />}
    </div>
  );
};
