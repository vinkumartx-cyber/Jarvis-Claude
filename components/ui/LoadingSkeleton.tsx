'use client';

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'text' | 'avatar';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = 'card',
  count = 1,
  className = '',
}: LoadingSkeletonProps) {
  const shimmerAnimation = `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
  `;

  const baseClasses =
    'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:1000px_100%]';

  const variants = {
    card: (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg border border-white/10 bg-white/[0.05]',
              'space-y-3 p-4',
              className
            )}
          >
            <div className={cn('h-6 rounded', baseClasses)} />
            <div className={cn('h-4 rounded', baseClasses)} style={{ width: '90%' }} />
            <div className={cn('h-4 rounded', baseClasses)} style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    ),
    list: (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn('h-12 rounded', baseClasses)} />
        ))}
      </div>
    ),
    text: (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn('h-4 rounded', baseClasses)}
            style={{ width: i === count - 1 ? '80%' : '100%' }}
          />
        ))}
      </div>
    ),
    avatar: (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-full', baseClasses)} />
            <div className="flex-1 space-y-2">
              <div className={cn('h-4 rounded', baseClasses)} style={{ width: '80%' }} />
              <div className={cn('h-3 rounded', baseClasses)} style={{ width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <>
      <style>{shimmerAnimation}</style>
      {variants[variant]}
    </>
  );
}

export default LoadingSkeleton;
