'use client';

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'red' | 'amber' | 'indigo';
  className?: string;
  onClick?: () => void;
}

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/20' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', ring: 'ring-green-500/20' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', ring: 'ring-red-500/20' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500/20' },
};

export function StatCard({ title, value, subtitle, icon, trend, trendValue, color = 'blue', className, onClick }: StatCardProps) {
  const palette = COLOR_MAP[color];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-400';

  return (
    <div
      className={cn(
        'card relative overflow-hidden p-6',
        onClick && 'card-hover',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Top decoration */}
      <div className={cn('absolute right-0 top-0 h-2 w-32 rounded-bl-full', palette.bg)} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-xl p-3 ring-1', palette.bg, palette.icon, palette.ring)}>
            {icon}
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-1.5">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span className={cn('text-sm font-medium', trendColor)}>{trendValue}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">vs last period</span>
        </div>
      )}
    </div>
  );
}
