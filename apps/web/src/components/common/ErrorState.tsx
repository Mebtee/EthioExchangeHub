'use client';

import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900/50 dark:bg-red-950/20',
        className,
      )}
    >
      <AlertCircle className="h-12 w-12 text-red-400 dark:text-red-500" />
      <h3 className="mt-4 text-lg font-semibold text-red-700 dark:text-red-400">
        Error
      </h3>
      <p className="mt-1 text-sm text-red-600 dark:text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-4">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: typeof Inbox;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  title = 'No data found',
  message = 'There are no items to display.',
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 dark:border-gray-700',
        className,
      )}
    >
      <Icon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-200">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-4">
          {action.label}
        </button>
      )}
    </div>
  );
}
