import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'glass';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-teal-500 text-white',
  secondary: 'bg-amber-500 text-white',
  success: 'bg-emerald-500 text-white',
  warning: 'bg-orange-500 text-white',
  info: 'bg-cyan-500 text-white',
  glass: 'bg-white/60 backdrop-blur-lg text-gray-800 shadow',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-block px-4 py-2 text-sm font-bold rounded-full ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
