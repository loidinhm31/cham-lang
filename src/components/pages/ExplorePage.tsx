import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../molecules';
import { Card } from '../atoms';
import { LanguageLevel } from '../../types/vocabulary';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const topics = [
    { id: 'business', emoji: '💼', color: 'from-blue-500 to-cyan-600' },
    { id: 'travel', emoji: '✈️', color: 'from-purple-500 to-pink-600' },
    { id: 'food', emoji: '🍔', color: 'from-orange-500 to-red-600' },
    { id: 'technology', emoji: '💻', color: 'from-teal-500 to-green-600' },
    { id: 'education', emoji: '📚', color: 'from-indigo-500 to-blue-600' },
    { id: 'health', emoji: '🏥', color: 'from-green-500 to-teal-600' },
    { id: 'sports', emoji: '⚽', color: 'from-yellow-500 to-orange-600' },
    { id: 'entertainment', emoji: '🎬', color: 'from-pink-500 to-rose-600' },
    { id: 'nature', emoji: '🌿', color: 'from-emerald-500 to-teal-600' },
    { id: 'daily', emoji: '☀️', color: 'from-amber-500 to-yellow-600' },
  ];

  const levels: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levelColors = {
    A1: 'from-emerald-500 to-teal-600',
    A2: 'from-teal-500 to-cyan-600',
    B1: 'from-cyan-500 to-blue-600',
    B2: 'from-blue-500 to-indigo-600',
    C1: 'from-amber-500 to-orange-600',
    C2: 'from-orange-500 to-red-600',
  };

  const handleTopicClick = (topic: string) => {
    navigate(`/explore/topic/${topic}`);
  };

  const handleLevelClick = (level: LanguageLevel) => {
    navigate(`/explore/level/${level}`);
  };

  return (
    <>
      <TopBar title={t('nav.explore')} showBack={false} />

      <div className="px-4 pt-6 space-y-8">
        {/* Topics Section */}
        <div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">{t('topics.title')}</h2>
          <div className="grid grid-cols-2 gap-4">
            {topics.map((topic) => (
              <Card
                key={topic.id}
                variant="default"
                hover
                onClick={() => handleTopicClick(topic.id)}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${topic.color} flex items-center justify-center text-3xl mb-3 mx-auto`}>
                  {topic.emoji}
                </div>
                <h3 className="text-lg font-bold text-gray-800 text-center">
                  {t(`topics.${topic.id}`)}
                </h3>
              </Card>
            ))}
          </div>
        </div>

        {/* Levels Section */}
        <div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">{t('vocabulary.level')}</h2>
          <div className="grid grid-cols-2 gap-4">
            {levels.map((level) => (
              <Card
                key={level}
                variant="default"
                hover
                onClick={() => handleLevelClick(level)}
              >
                <div className={`w-full h-20 rounded-2xl bg-gradient-to-br ${levelColors[level]} flex items-center justify-center mb-3`}>
                  <span className="text-4xl font-black text-white">{level}</span>
                </div>
                <p className="text-sm font-semibold text-gray-700 text-center">
                  {t(`levels.${level}`)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
