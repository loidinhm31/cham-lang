import React, { useState, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";
import { Button, Input, AudioPlayer } from "@/components/atoms";
import { useTranslation } from "react-i18next";

interface FillWordCardProps {
  definition: string;
  correctAnswer: string;
  hint?: string;
  audioUrl?: string;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
  selfAssessmentMode?: boolean; // Enable self-assessment: user decides if their answer is correct
}

export const FillWordCard: React.FC<FillWordCardProps> = ({
  definition,
  correctAnswer,
  hint,
  audioUrl,
  onAnswer,
  selfAssessmentMode = false,
}) => {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [awaitingSelfAssessment, setAwaitingSelfAssessment] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitted) {
      return;
    }

    setSubmitted(true);

    // Always auto-evaluate the answer
    // Normalize Unicode to handle Vietnamese diacritics (NFC form)
    const userAnswer = answer.trim().toLowerCase().normalize('NFC');
    const correctAnswerNormalized = correctAnswer.toLowerCase().normalize('NFC');
    const correct = userAnswer === correctAnswerNormalized;
    setIsCorrect(correct);

    if (correct) {
      // If correct, immediately call onAnswer
      onAnswer(true, answer.trim());
    } else if (selfAssessmentMode) {
      // If incorrect in self-assessment mode, wait for user decision
      setAwaitingSelfAssessment(true);
    } else {
      // If incorrect in normal mode, immediately call onAnswer
      onAnswer(false, answer.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !submitted) {
      handleSubmit(e);
    }
  };

  const handleSelfAssessment = useCallback(
    (overrideAsCorrect: boolean) => {
      setAwaitingSelfAssessment(false);
      if (overrideAsCorrect) {
        // User says they were correct, override the evaluation
        setIsCorrect(true);
        onAnswer(true, answer.trim());
      } else {
        // User confirms they were incorrect
        onAnswer(false, answer.trim());
      }
    },
    [answer, onAnswer],
  );

  // Keyboard shortcuts for self-assessment mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!awaitingSelfAssessment) return;

      // "1" key for "I was correct"
      if (e.key === "1") {
        e.preventDefault();
        handleSelfAssessment(true);
      }
      // "2" key for "I was incorrect"
      else if (e.key === "2") {
        e.preventDefault();
        handleSelfAssessment(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [awaitingSelfAssessment, handleSelfAssessment]);

  return (
    <div className="h-full w-full bg-[#ADD8E6] rounded-[32px] border-[4px] border-[#8FC4DE] shadow-[0_12px_0_rgba(0,0,0,0.15),0_6px_20px_rgba(0,0,0,0.12),inset_0_-3px_6px_rgba(0,0,0,0.08)] p-8">
      <div className="flex flex-col h-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-6">✏️</div>
          <h3 className="text-3xl font-black text-gray-900 mb-6">
            {t("practice.fillWordTitle")}
          </h3>
          <div className="bg-white rounded-3xl p-6 border-[3px] border-gray-300 shadow-[0_6px_0_rgba(0,0,0,0.1),0_3px_8px_rgba(0,0,0,0.08)]">
            <p className="text-2xl font-semibold text-gray-900 leading-relaxed">
              {definition}
            </p>
            {audioUrl && (
              <div className="flex justify-center mt-4">
                <AudioPlayer audioUrl={audioUrl} size="md" />
              </div>
            )}
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
              placeholder={t("practice.typeYourAnswer")}
              disabled={submitted}
              className="text-2xl text-center font-bold py-4"
              autoFocus
            />
            {submitted && isCorrect !== null && (
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
              {t("practice.checkAnswer")}
            </Button>
          )}

          {/* Self-assessment mode: waiting for user decision */}
          {awaitingSelfAssessment && (
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-white border-[3px] border-gray-300 shadow-[0_4px_0_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-600 mb-2">
                      {t("practice.yourAnswer")}
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {answer.trim()}
                    </p>
                  </div>
                  <div className="border-t-2 border-gray-200 pt-4">
                    <p className="text-sm font-bold text-gray-600 mb-2">
                      {t("practice.correctAnswer")}
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {correctAnswer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => handleSelfAssessment(true)}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Check className="w-6 h-6 mr-2" />
                  {t("practice.iWasCorrect")} (1)
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => handleSelfAssessment(false)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <X className="w-6 h-6 mr-2" />
                  {t("practice.iWasIncorrect")} (2)
                </Button>
              </div>
            </div>
          )}

          {/* Normal feedback after evaluation */}
          {submitted && isCorrect !== null && !awaitingSelfAssessment && (
            <div className="space-y-4">
              <div
                className={`p-6 rounded-3xl text-center border-[3px] shadow-[0_4px_0_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1)] ${
                  isCorrect
                    ? "bg-[#98FF98] border-[#7EE57E] text-emerald-900"
                    : "bg-[#FFD1DC] border-[#FFB3C1] text-red-900"
                }`}
              >
                <p className="font-black text-2xl mb-3">
                  {isCorrect
                    ? t("practice.correctResult")
                    : t("practice.incorrectResult")}
                </p>
                {!isCorrect && (
                  <p className="text-base font-semibold">
                    {t("practice.theCorrectAnswerIs")}{" "}
                    <span className="font-black text-lg">{correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
