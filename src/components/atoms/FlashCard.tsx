import React, { useState } from "react";
import { Card } from "./Card";

interface FlashCardProps {
  front: string;
  back: string;
  subtitle?: string;
  onFlip?: (isFlipped: boolean) => void;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  front,
  back,
  subtitle,
  onFlip,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    onFlip?.(newFlipped);
  };

  return (
    <div
      className="relative w-full h-80 cursor-pointer perspective-1000"
      onClick={handleClick}
    >
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
        {/* Front */}
        <div className="flip-card-front">
          <Card
            variant="gradient"
            className="h-full flex flex-col items-center justify-center"
          >
            <img
              src="/chameleon.svg"
              alt="Cham Lang"
              className="w-24 h-24 mb-6"
            />
            <h2 className="text-4xl font-black mb-2">{front}</h2>
            {subtitle && <p className="text-xl text-white/90">{subtitle}</p>}
            <p className="text-sm text-white/70 mt-8">Tap to reveal</p>
          </Card>
        </div>

        {/* Back */}
        <div className="flip-card-back">
          <Card
            variant="glass"
            className="h-full flex items-center justify-center"
          >
            <div className="text-center px-6">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-2xl font-bold text-gray-800 mb-4">{back}</p>
              <p className="text-sm text-gray-600">Tap to flip back</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
