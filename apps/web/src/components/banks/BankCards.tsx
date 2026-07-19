'use client';

import { Building2, Globe, Phone, Mail, MapPin, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bank } from '@/lib/types';

interface BankCardsProps {
  banks: Bank[];
  isLoading?: boolean;
  onBankClick?: (bank: Bank) => void;
  compact?: boolean;
}

export function BankCards({ banks, isLoading, onBankClick, compact }: BankCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card animate-pulse p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-1 h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (banks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-12">
        <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No banks found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {banks.map((bank) => (
        <div
          key={bank.id}
          onClick={() => onBankClick?.(bank)}
          className={cn(
            'card group relative p-5 transition-all duration-200',
            onBankClick && 'card-hover',
          )}
        >
          {/* Decorator */}
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-primary-50 opacity-50 dark:bg-primary-900/10" />

          <div className="relative">
            {/* Header */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                {bank.code.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {bank.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{bank.code}</p>
              </div>
              {onBankClick && (
                <ChevronRight className="h-4 w-4 text-gray-300 opacity-0 transition-all group-hover:opacity-100 dark:text-gray-600" />
              )}
            </div>

            {/* Contact details */}
            {!compact && (
              <div className="space-y-1.5">
                {bank.website && (
                  <a
                    href={bank.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="truncate">{new URL(bank.website).hostname}</span>
                  </a>
                )}
                {bank.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{bank.phone}</span>
                  </div>
                )}
                {bank.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{bank.email}</span>
                  </div>
                )}
                {bank.address && (
                  <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{bank.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Badge */}
            {bank.swiftCode && (
              <div className="mt-3 flex items-center gap-1">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  SWIFT: {bank.swiftCode}
                </span>
                {bank.sortOrder <= 3 && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Top {bank.sortOrder}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
