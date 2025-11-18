import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, PenTool, CheckSquare } from 'lucide-react';
import { TopBar } from '../molecules';
import { Card } from '../atoms';

export const PracticeModePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const modes = [
    {
      id: 'flashcard',
      title: t('practice.flashcardMode'),
      description: t('practice.flashcardDescription'),
      icon: Brain,
      color: 'from-purple-500 to-pink-600',
      path: '/practice/flashcard',
    },
    {
      id: 'fillword',
      title: t('practice.fillWordMode'),
      description: t('practice.fillWordDescription'),
      icon: PenTool,
      color: 'from-blue-500 to-cyan-600',
      path: '/practice/fill-word',
    },
    {
      id: 'multiplechoice',
      title: t('practice.multipleChoiceMode'),
      description: t('practice.multipleChoiceDescription'),
      icon: CheckSquare,
      color: 'from-amber-500 to-orange-600',
      path: '/practice/multiple-choice',
    },
  ];

  return (
    <>
      <TopBar title={t('practice.title')} showBack />

      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            {t('practice.selectMode')}
          </h1>
          <p className="text-lg text-gray-700">{t('practice.selectModeDescription')}</p>
        </div>

        {/* Mode Cards */}
        <div className="space-y-4">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Card
                key={mode.id}
                variant="default"
                hover
                onClick={() => navigate(mode.path)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{mode.title}</h3>
                    <p className="text-gray-600">{mode.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
};
