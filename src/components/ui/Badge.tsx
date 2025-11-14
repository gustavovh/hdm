import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant, color, size = 'md' }: BadgeProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    red: 'bg-red-100 text-red-800 border border-red-200',
    blue: 'bg-blue-100 text-blue-800 border border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  const variantClasses = {
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    error: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border border-gray-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const finalClass = color ? colorClasses[color] : variantClasses[variant || 'neutral'];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${finalClass} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  );
}
