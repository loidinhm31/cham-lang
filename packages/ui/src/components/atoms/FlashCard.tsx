import React, { useState } from "react";
import { AudioPlayer } from "./AudioPlayer";

import chameleonIcon from "../../assets/chameleon.svg";

interface FlashCardProps {
  front: string;
  back: string;
  subtitle?: string;
  audioUrl?: string;
  onFlip?: (isFlipped: boolean) => void;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  front,
  back,
  subtitle,
  audioUrl,
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
      className="relative w-full h-96 cursor-pointer perspective-1000"
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
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
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
        {/* Front - Vibrant Gradient Clay Card */}
        <div className="flip-card-front">
          <div className="h-full w-full bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-[32px] border-[4px] border-purple-700 shadow-[0_12px_0_rgba(0,0,0,0.2),0_6px_20px_rgba(0,0,0,0.15),inset_0_-3px_6px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-8">
            <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <img src={chameleonIcon} alt="Cham Lang" className="w-20 h-20" />
            </div>
            <h2 className="text-5xl font-black text-white mb-3 text-center drop-shadow-lg whitespace-pre-line">
              {front}
            </h2>
            {subtitle && (
              <div className="flex items-center justify-center gap-3 mb-2">
                <p className="text-2xl font-semibold text-white/90 text-center">
                  {subtitle}
                </p>
                {audioUrl && <AudioPlayer audioUrl={audioUrl} size="md" />}
              </div>
            )}
            <p className="text-sm font-bold text-white/70 mt-10 px-6 py-2 bg-white/10 rounded-full">
              Tap to reveal ✨
            </p>
          </div>
        </div>

        {/* Back - Pastel Clay Card */}
        <div className="flip-card-back">
          <div className="h-full w-full bg-[#FFF9C4] rounded-[32px] border-[4px] border-[#FFF59D] shadow-[0_12px_0_rgba(0,0,0,0.2),0_6px_20px_rgba(0,0,0,0.15),inset_0_-3px_6px_rgba(0,0,0,0.1)] flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-6xl mb-6">💡</div>
              <p className="text-3xl font-bold text-gray-900 mb-6 leading-relaxed whitespace-pre-line">
                {back}
              </p>
              <p className="text-sm font-bold text-gray-600 px-6 py-2 bg-white/60 rounded-full inline-block border-2 border-gray-300 shadow-sm">
                Tap to flip back
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
