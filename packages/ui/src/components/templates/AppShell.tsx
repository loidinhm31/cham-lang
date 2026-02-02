import React from "react";
import { Outlet } from "react-router-dom";
import { BottomNavigation } from "@cham-lang/ui/components/molecules";

export const AppShell: React.FC = () => {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--bg-gradient)" }}
    >
      <div className="relative z-10 w-full pb-40">
        <Outlet />
      </div>

      <BottomNavigation />
    </div>
  );
};
