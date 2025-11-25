import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingSizes = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-lg shadow-sm ${paddingSizes[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
