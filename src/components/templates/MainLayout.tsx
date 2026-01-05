import React from "react";
import { Outlet } from "react-router-dom";
import { BottomNavigation } from "@/components/molecules";

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-amber-200 via-cyan-100 to-teal-200 relative overflow-hidden">
      <div className="relative z-10 w-full pb-40">
        <Outlet />
      </div>

      <BottomNavigation />
    </div>
  );
};
