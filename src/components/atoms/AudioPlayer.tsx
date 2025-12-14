import React, { useRef, useState, useEffect } from "react";
import { Volume2, VolumeX, Volume } from "lucide-react";

interface AudioPlayerProps {
  audioUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  size = "md",
  className = "",
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Validate audio URL
  const isValidAudioUrl = (url: string): boolean => {
    const validExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
    const lowerUrl = url.toLowerCase();
    return validExtensions.some((ext) => lowerUrl.includes(ext));
  };

  // Reset error state when URL changes
  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
  }, [audioUrl]);

  // Handle audio playback
  const handlePlay = () => {
    if (!audioRef.current || !audioUrl || hasError) return;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((error) => {
        console.error("Audio playback failed:", error);
        setHasError(true);
        setIsPlaying(false);
      });
  };

  // Handle audio end
  const handleEnded = () => {
    setIsPlaying(false);
  };

  // Handle audio error
  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  // Don't render if no URL
  if (!audioUrl || audioUrl.trim() === "") {
    return null;
  }

  // Check if URL is valid
  const isValid = isValidAudioUrl(audioUrl);
  const isDisabled = !isValid || hasError;

  // Choose icon based on state
  const Icon = hasError || !isValid ? VolumeX : isPlaying ? Volume : Volume2;

  return (
    <>
      <button
        onClick={handlePlay}
        disabled={isDisabled}
        className={`
          ${sizeClasses[size]}
          ${className}
          rounded-full
          bg-white/80 backdrop-blur-sm
          shadow-md
          flex items-center justify-center
          transition-all duration-200
          ${
            isDisabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-white/90 hover:scale-110 active:scale-95"
          }
        `}
        aria-label={
          hasError || !isValid
            ? "Audio unavailable"
            : isPlaying
              ? "Playing audio"
              : "Play pronunciation"
        }
      >
        <Icon
          className={`${iconSizeClasses[size]} ${isDisabled ? "text-gray-400" : "text-blue-600"}`}
        />
      </button>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleEnded}
        onError={handleError}
        preload="none"
      />
    </>
  );
};
