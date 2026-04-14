'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import LoadingSkeleton from './LoadingSkeleton';

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  loadingVariant?: 'card' | 'list' | 'text';
  hover?: boolean;
}

export function Card({
  children,
  className = '',
  header,
  footer,
  loading = false,
  loadingVariant = 'card',
  hover = true,
}: CardProps) {
  if (loading) {
    return <LoadingSkeleton variant={loadingVariant} />;
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-white/10 bg-white/[0.05] backdrop-blur-md',
        'shadow-lg',
        hover && 'transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-xl',
        className
      )}
    >
      {header && (
        <div className="border-b border-white/10 px-6 py-4">
          {header}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
      {footer && (
        <div className="border-t border-white/10 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
