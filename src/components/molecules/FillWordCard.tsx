import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Button, Input } from "@/components/atoms";

interface FillWordCardProps {
  definition: string;
  correctAnswer: string;
  hint?: string;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

export const FillWordCard: React.FC<FillWordCardProps> = ({
  definition,
  correctAnswer,
  hint,
  onAnswer,
}) => {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitted) {
      return;
    }

    const userAnswer = answer.trim().toLowerCase();
    const correct = userAnswer === correctAnswer.toLowerCase();

    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(correct, answer.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !submitted) {
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full w-full bg-[#ADD8E6] rounded-[32px] border-[4px] border-[#8FC4DE] shadow-[0_12px_0_rgba(0,0,0,0.15),0_6px_20px_rgba(0,0,0,0.12),inset_0_-3px_6px_rgba(0,0,0,0.08)] p-8">
      <div className="flex flex-col h-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-6">✏️</div>
          <h3 className="text-3xl font-black text-gray-900 mb-6">
            Fill in the word
          </h3>
          <div className="bg-white rounded-3xl p-6 border-[3px] border-gray-300 shadow-[0_6px_0_rgba(0,0,0,0.1),0_3px_8px_rgba(0,0,0,0.08)]">
            <p className="text-2xl font-semibold text-gray-900 leading-relaxed">
              {definition}
            </p>
          </div>
          {hint && !submitted && (
            <div className="mt-6 px-5 py-3 bg-[#FFF9C4] rounded-2xl border-2 border-[#FFF59D] shadow-sm inline-block">
              <p className="text-sm font-bold text-gray-800">💡 Hint: {hint}</p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 flex-1 flex flex-col justify-end"
        >
          <div className="relative">
            <Input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              disabled={submitted}
              className="text-2xl text-center font-bold py-4"
              autoFocus
            />
            {submitted && (
              <div
                className={`absolute right-5 top-1/2 transform -translate-y-1/2 ${
                  isCorrect ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {isCorrect ? (
                  <Check className="w-10 h-10 stroke-[3]" />
                ) : (
                  <X className="w-10 h-10 stroke-[3]" />
                )}
              </div>
            )}
          </div>

          {!submitted && (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!answer.trim()}
            >
              Check Answer
            </Button>
          )}

          {submitted && (
            <div
              className={`p-6 rounded-3xl text-center border-[3px] shadow-[0_4px_0_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)] ${
                isCorrect
                  ? "bg-[#98FF98] border-[#7EE57E] text-emerald-900"
                  : "bg-[#FFD1DC] border-[#FFB3C1] text-red-900"
              }`}
            >
              <p className="font-black text-2xl mb-3">
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              {!isCorrect && (
                <p className="text-base font-semibold">
                  The correct answer is:{" "}
                  <span className="font-black text-lg">{correctAnswer}</span>
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
