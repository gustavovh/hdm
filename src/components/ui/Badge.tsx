import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant, color, size = 'md' }: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const getColorClasses = () => {
    if (color === 'green') return 'bg-green-100 text-green-800 border border-green-200';
    if (color === 'yellow') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (color === 'red') return 'bg-red-100 text-red-800 border border-red-200';
    if (color === 'blue') return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (color === 'gray') return 'bg-gray-100 text-gray-800 border border-gray-200';

    if (variant === 'success') return 'bg-green-100 text-green-800 border border-green-200';
    if (variant === 'warning') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (variant === 'error') return 'bg-red-100 text-red-800 border border-red-200';
    if (variant === 'info') return 'bg-blue-100 text-blue-800 border border-blue-200';

    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${getColorClasses()} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  );
}
