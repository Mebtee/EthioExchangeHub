'use client';

import { Languages } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/locale-provider';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/translations';

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useTranslation();

  const locales: { code: Locale; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'EN' },
    { code: 'am', label: 'አማርኛ', native: 'አማ' },
  ];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Languages className="h-4 w-4 text-gray-400" />
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-all',
            locale === l.code
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
          title={l.label}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
