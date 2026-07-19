'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatRate, getCurrencyFlag } from '@/lib/utils';
import type { RateRecord } from '@/lib/types';

interface LiveTickerProps {
  rates: RateRecord[];
  isLoading?: boolean;
}

export function LiveTicker({ rates, isLoading }: LiveTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [prevRates, setPrevRates] = useState<Record<string, number>>({});

  // Track previous rates for change detection
  useEffect(() => {
    const newMap: Record<string, number> = {};
    rates.forEach((r) => {
      newMap[`${r.bankCode}-${r.currencyTo}-buy`] = r.buyRate;
    });
    // Only update prevRates after the first render
    if (Object.keys(prevRates).length === 0 && rates.length > 0) {
      setPrevRates(newMap);
    } else if (rates.length > 0) {
      setPrevRates(newMap);
    }
  }, [rates]);

  // Pause on hover
  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  if (isLoading || rates.length === 0) {
    return (
      <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    );
  }

  // Deduplicate: only show latest rate per (bank, currency) combo
  const seen = new Set<string>();
  const displayRates = rates.filter((r) => {
    const key = `${r.bankCode}-${r.currencyTo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient overlays */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-white to-transparent dark:from-gray-900" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-white to-transparent dark:from-gray-900" />

      <div
        ref={scrollRef}
        className={cn(
          'flex items-center gap-6 overflow-hidden py-2.5',
          isPaused ? '' : 'animate-ticker',
        )}
        style={{ width: displayRates.length * 250 }}
      >
        {/* Double the items for seamless loop */}
        {[...displayRates, ...displayRates].map((rate, idx) => {
          const prevBuy = prevRates[`${rate.bankCode}-${rate.currencyTo}-buy`];
          const changed = prevBuy !== undefined && prevBuy !== rate.buyRate;
          const increased = changed && rate.buyRate > (prevBuy ?? 0);

          return (
            <div
              key={`${rate.bankCode}-${rate.currencyTo}-${idx}`}
              className="flex flex-shrink-0 items-center gap-2.5 px-3"
            >
              <span className="text-sm">{getCurrencyFlag(rate.currencyTo)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {rate.bankCode}
                </span>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatRate(rate.buyRate)}
                </span>
                {changed && (
                  <span className={cn(increased ? 'text-green-500' : 'text-red-500')}>
                    {increased ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
