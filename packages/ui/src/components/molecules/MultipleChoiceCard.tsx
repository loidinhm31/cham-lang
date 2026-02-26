import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { AudioPlayer } from "@cham-lang/ui/components/atoms";

interface MultipleChoiceCardProps {
  question: string;
  subtitle?: string;
  audioUrl?: string;
  options: string[];
  correctAnswer: string;
  onAnswer: (correct: boolean, selectedAnswer?: string) => void;
}

export const MultipleChoiceCard: React.FC<MultipleChoiceCardProps> = ({
  question,
  subtitle,
  audioUrl,
  options,
  correctAnswer,
  onAnswer,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleOptionClick = useCallback(
    (option: string) => {
      if (answered) {
        return;
      }

      setSelectedOption(option);
      setAnswered(true);
      const isCorrect = option === correctAnswer;
      onAnswer(isCorrect, option);
    },
    [answered, correctAnswer, onAnswer],
  );

  // Keyboard shortcut handler — deps limited to [answered] to avoid re-registration
  // on parent re-renders; optionsRef keeps latest options without expanding deps
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (answered) return;
      const index = parseInt(event.key) - 1;
      if (index >= 0 && index < optionsRef.current.length) {
        handleOptionClick(optionsRef.current[index]);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [answered, handleOptionClick]);

  const getOptionStyle = (option: string) => {
    if (!answered) {
      return "bg-white border-gray-300 text-gray-900 hover:translate-y-[-2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.1)]";
    }

    if (option === correctAnswer) {
      return "bg-(--color-answer-correct) border-(--color-answer-correct-border) text-emerald-900";
    }

    if (option === selectedOption && option !== correctAnswer) {
      return "bg-(--color-answer-incorrect) border-(--color-answer-incorrect-border) text-red-900";
    }

    return "bg-gray-200 border-gray-400 text-gray-500";
  };

  return (
    <div className="h-full w-full bg-(--color-word-adjective) rounded-[32px] border-[4px] border-(--color-word-adjective-border) shadow-[0_12px_0_rgba(0,0,0,0.15),0_6px_20px_rgba(0,0,0,0.12),inset_0_-3px_6px_rgba(0,0,0,0.08)] p-8">
      <div className="flex flex-col h-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-6">🎯</div>
          <h3 className="text-4xl font-black text-gray-900 mb-3 whitespace-pre-line">
            {question}
          </h3>
          {subtitle && (
            <div className="flex items-center justify-center gap-3">
              <p className="text-xl font-semibold text-indigo-600">
                {subtitle}
              </p>
              {audioUrl && <AudioPlayer audioUrl={audioUrl} size="md" />}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={answered}
              className={`w-full py-5 px-6 text-lg font-bold rounded-3xl border-[3px] shadow-[0_6px_0_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.08),inset_0_-2px_3px_rgba(0,0,0,0.05)] transition-all duration-200 active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.08)] disabled:cursor-not-allowed ${getOptionStyle(
                option,
              )}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black text-lg border-2 border-indigo-600 shadow-sm shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-left whitespace-pre-line">
                    {option}
                  </span>
                </div>
                {answered && option === correctAnswer && (
                  <Check className="w-7 h-7 stroke-[3] shrink-0" />
                )}
                {answered &&
                  option === selectedOption &&
                  option !== correctAnswer && (
                    <X className="w-7 h-7 stroke-[3] shrink-0" />
                  )}
              </div>
            </button>
          ))}
        </div>

        {answered && (
          <div
            className={`mt-6 p-6 rounded-3xl text-center border-[3px] shadow-[0_4px_0_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)] ${
              selectedOption === correctAnswer
                ? "bg-(--color-answer-correct) border-(--color-answer-correct-border) text-emerald-900"
                : "bg-(--color-answer-incorrect) border-(--color-answer-incorrect-border) text-red-900"
            }`}
          >
            <p className="font-black text-2xl mb-2">
              {selectedOption === correctAnswer ? "✓ Correct!" : "✗ Incorrect"}
            </p>
            {selectedOption !== correctAnswer && (
              <p className="text-base font-semibold mt-2">
                Correct answer:{" "}
                <span className="font-black whitespace-pre-line">
                  {correctAnswer}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
