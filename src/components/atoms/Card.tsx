import React from 'react';

export type CardVariant = 'default' | 'glass' | 'gradient';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white/40 backdrop-blur-lg',
  glass: 'bg-white/60 backdrop-blur-lg',
  gradient: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  onClick,
  hover = false,
}) => {
  const hoverStyles = hover ? 'transform transition hover:scale-105 hover:shadow-2xl cursor-pointer' : '';

  return (
    <div
      className={`rounded-3xl p-4 shadow-xl ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
