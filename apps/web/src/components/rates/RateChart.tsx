'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { cn, formatRate, getCurrencyColor } from '@/lib/utils';
import type { RateRecord } from '@/lib/types';

interface RateChartProps {
  data: RateRecord[];
  bankName?: string;
  currencyTo?: string;
  height?: number;
  showArea?: boolean;
}

export function RateChart({
  data,
  bankName,
  currencyTo,
  height = 300,
  showArea = true,
}: RateChartProps) {
  const [activeLine, setActiveLine] = useState<'buy' | 'sell' | 'both'>('both');

  const chartData = useMemo(() => {
    // Group by date and compute average rates
    const grouped = new Map<string, { buySum: number; sellSum: number; count: number }>();

    data.forEach((r) => {
      const dateKey = r.effectiveDate?.split('T')[0] ?? '';
      if (!dateKey) return;
      const existing = grouped.get(dateKey) ?? { buySum: 0, sellSum: 0, count: 0 };
      existing.buySum += r.buyRate;
      existing.sellSum += r.sellRate;
      existing.count += 1;
      grouped.set(dateKey, existing);
    });

    return Array.from(grouped.entries())
      .map(([date, vals]) => ({
        date,
        label: format(parseISO(date), 'MMM d'),
        buyRate: Math.round((vals.buySum / vals.count) * 10000) / 10000,
        sellRate: Math.round((vals.sellSum / vals.count) * 10000) / 10000,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-sm text-gray-400">No chart data available</p>
      </div>
    );
  }

  const currencyColor = getCurrencyColor(currencyTo ?? 'USD');

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'buyRate' ? 'Buy' : 'Sell'}: {formatRate(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div>
      {/* Legend toggle */}
      <div className="mb-3 flex items-center gap-4">
        <button
          onClick={() => setActiveLine(activeLine === 'buy' ? 'both' : 'buy')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            activeLine !== 'sell'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'text-gray-400 dark:text-gray-500',
          )}
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Buy Rate
        </button>
        <button
          onClick={() => setActiveLine(activeLine === 'sell' ? 'both' : 'sell')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            activeLine !== 'buy'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-400 dark:text-gray-500',
          )}
        >
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Sell Rate
        </button>
        {bankName && (
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{bankName}</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip content={renderTooltip} />

          {activeLine !== 'sell' && (
            showArea ? (
              <>
                <defs>
                  <linearGradient id="buyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="buyRate"
                  stroke="#22c55e"
                  fill="url(#buyGradient)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="buyRate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )
          )}

          {activeLine !== 'buy' && (
            showArea ? (
              <>
                <defs>
                  <linearGradient id="sellGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="sellRate"
                  stroke="#3b82f6"
                  fill="url(#sellGradient)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="sellRate"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
