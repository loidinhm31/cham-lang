import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'outline' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-2xl',
  secondary: 'text-white bg-gradient-to-r from-teal-500 to-cyan-600 shadow-2xl',
  glass: 'text-gray-800 bg-white/60 backdrop-blur-lg shadow-lg hover:bg-white/80',
  outline: 'text-teal-600 border-2 border-teal-500 hover:bg-teal-50',
  success: 'text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg',
  danger: 'text-white bg-gradient-to-r from-red-500 to-pink-600 shadow-lg',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2 px-4 text-base',
  lg: 'py-2.5 px-6 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-bold rounded-full transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="inline w-5 h-5 mr-2" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className="inline w-5 h-5 ml-2" />}
    </button>
  );
};
