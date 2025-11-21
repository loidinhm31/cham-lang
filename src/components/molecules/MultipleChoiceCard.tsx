import React, { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { Card, Badge } from '../atoms';

interface MultipleChoiceCardProps {
  question: string;
  subtitle?: string;
  options: string[];
  correctAnswer: string;
  onAnswer: (correct: boolean, selectedAnswer?: string) => void;
}

export const MultipleChoiceCard: React.FC<MultipleChoiceCardProps> = ({
  question,
  subtitle,
  options,
  correctAnswer,
  onAnswer,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleOptionClick = useCallback((option: string) => {
    if (answered) {
      return;
    }

    setSelectedOption(option);
    setAnswered(true);
    const isCorrect = option === correctAnswer;
    onAnswer(isCorrect, option);
  }, [answered, correctAnswer, onAnswer]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (answered) {
        return;
      }

      const key = event.key;
      const index = parseInt(key) - 1;

      if (index >= 0 && index < options.length) {
        handleOptionClick(options[index]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [answered, options, handleOptionClick]);

  const getOptionStyle = (option: string) => {
    if (!answered) {
      return 'bg-white/60 hover:bg-white/80 text-gray-800 border-2 border-transparent';
    }

    if (option === correctAnswer) {
      return 'bg-emerald-500 text-white border-2 border-emerald-600';
    }

    if (option === selectedOption && option !== correctAnswer) {
      return 'bg-red-500 text-white border-2 border-red-600';
    }

    return 'bg-white/40 text-gray-500';
  };

  return (
    <Card variant="glass" className="h-full">
      <div className="flex flex-col h-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-3xl font-black text-gray-800 mb-2">{question}</h3>
          {subtitle && <p className="text-lg text-teal-700">{subtitle}</p>}
        </div>

        <div className="flex-1 space-y-4">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={answered}
              className={`w-full py-4 px-6 text-lg font-semibold rounded-2xl transition transform active:scale-95 disabled:cursor-not-allowed ${getOptionStyle(
                option
              )}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="glass" className="px-3 py-1 text-base font-bold shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="text-left">{option}</span>
                </div>
                {answered && option === correctAnswer && (
                  <Check className="w-6 h-6 shrink-0" />
                )}
                {answered && option === selectedOption && option !== correctAnswer && (
                  <X className="w-6 h-6 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {answered && (
          <div className={`mt-6 p-4 rounded-2xl text-center ${
            selectedOption === correctAnswer
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <p className="font-bold">
              {selectedOption === correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            {selectedOption !== correctAnswer && (
              <p className="text-sm mt-1">Correct answer: {correctAnswer}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
