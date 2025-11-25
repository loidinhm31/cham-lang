import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Button, Card, Input } from "@/components/atoms";

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
    <Card variant="glass" className="h-full">
      <div className="flex flex-col h-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">✏️</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Fill in the word
          </h3>
          <div className="bg-white/60 p-6 rounded-2xl">
            <p className="text-xl text-gray-800 leading-relaxed">
              {definition}
            </p>
          </div>
          {hint && !submitted && (
            <p className="text-sm text-teal-700 mt-4">💡 Hint: {hint}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              disabled={submitted}
              className="text-xl text-center font-semibold"
              autoFocus
            />
            {submitted && (
              <div
                className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${
                  isCorrect ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {isCorrect ? (
                  <Check className="w-8 h-8" />
                ) : (
                  <X className="w-8 h-8" />
                )}
              </div>
            )}
          </div>

          {!submitted && (
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!answer.trim()}
            >
              Check Answer
            </Button>
          )}

          {submitted && (
            <div
              className={`p-4 rounded-2xl text-center ${
                isCorrect
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <p className="font-bold text-lg mb-2">
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              {!isCorrect && (
                <p className="text-sm">
                  The correct answer is:{" "}
                  <span className="font-bold">{correctAnswer}</span>
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </Card>
  );
};
