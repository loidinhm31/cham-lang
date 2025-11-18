import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms';

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {title || t('stats.totalWords')}
        </h3>
        <TrendingUp className="w-6 h-6 text-teal-600" />
      </div>
      <div className={`grid grid-cols-${Math.min(stats.length, 3)} gap-4`}>
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center">
            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
