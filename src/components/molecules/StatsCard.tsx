import React from "react";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/atoms";

interface Stat {
  value: number;
  label: string;
  color: string;
}

interface StatsCardProps {
  stats: Stat[];
  title?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ stats, title }) => {
  const { t } = useTranslation();

  return (
    <Card variant="glass">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title section */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <h3 className="text-base font-bold text-gray-800">
            {title || t("stats.totalWords")}
          </h3>
        </div>

        {/* Stats section - row display on all screens, wraps if needed */}
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`text-2xl font-black ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-600 whitespace-nowrap">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
