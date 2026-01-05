import React from "react";

export type WordStatus = "NEW" | "STILL_LEARNING" | "ALMOST_DONE" | "MASTERED";

interface StatusBadgeProps {
  status: WordStatus;
  currentRep: number;
  totalReps: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  currentRep,
  totalReps,
}) => {
  const statusConfig = {
    NEW: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
      label: "🆕 NEW",
    },
    STILL_LEARNING: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
      label: "📚 LEARNING",
    },
    ALMOST_DONE: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-300",
      label: "🎯 ALMOST DONE",
    },
    MASTERED: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
      label: "✅ MASTERED",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${config.bg} ${config.text} ${config.border}`}
    >
      <span className="font-semibold text-sm">{config.label}</span>
      <span className="text-xs opacity-75">
        {currentRep}/{totalReps} reps
      </span>
    </div>
  );
};
