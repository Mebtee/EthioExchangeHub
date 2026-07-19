'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400',
          sizeClasses[size],
        )}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 pb-3 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`h-${i}`} className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 border-b border-gray-100 py-3 dark:border-gray-800">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={`c-${r}-${c}`}
              className="h-3 flex-1 rounded bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse p-6">
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mb-2 h-8 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}
