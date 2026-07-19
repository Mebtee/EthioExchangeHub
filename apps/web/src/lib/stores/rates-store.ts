'use client';

import { create } from 'zustand';
import type { RateFilters, HistoricalRateFilters, CompareFilters, BestRatesFilters } from '@/lib/types';

interface RatesState {
  // Latest rates filters
  latestFilters: RateFilters;
  setLatestFilters: (filters: Partial<RateFilters>) => void;
  resetLatestFilters: () => void;

  // Historical rates filters
  historicalFilters: HistoricalRateFilters;
  setHistoricalFilters: (filters: Partial<HistoricalRateFilters>) => void;
  resetHistoricalFilters: () => void;

  // Compare filters
  compareFilters: CompareFilters;
  setCompareFilters: (filters: Partial<CompareFilters>) => void;
  resetCompareFilters: () => void;

  // Best rates filters
  bestFilters: BestRatesFilters;
  setBestFilters: (filters: Partial<BestRatesFilters>) => void;
  resetBestFilters: () => void;

  // Selected currencies
  selectedCurrencies: string[];
  setSelectedCurrencies: (currencies: string[]) => void;
  toggleCurrency: (currency: string) => void;
}

const DEFAULT_LATEST_FILTERS: RateFilters = {
  currencyTo: undefined,
  bankCode: undefined,
  page: 1,
  limit: 20,
  sortBy: 'effectiveDate',
  sortOrder: 'desc',
};

const DEFAULT_HISTORICAL_FILTERS: HistoricalRateFilters = {
  ...DEFAULT_LATEST_FILTERS,
  fromDate: undefined,
  toDate: undefined,
};

const DEFAULT_COMPARE_FILTERS: CompareFilters = {
  currencyTo: 'USD',
  date: undefined,
  banks: undefined,
};

const DEFAULT_BEST_FILTERS: BestRatesFilters = {
  currencyTo: 'USD',
  type: 'buy',
  date: undefined,
};

export const useRatesStore = create<RatesState>()((set) => ({
  latestFilters: DEFAULT_LATEST_FILTERS,
  setLatestFilters: (filters) =>
    set((state) => ({
      latestFilters: { ...state.latestFilters, ...filters },
    })),
  resetLatestFilters: () => set({ latestFilters: DEFAULT_LATEST_FILTERS }),

  historicalFilters: DEFAULT_HISTORICAL_FILTERS,
  setHistoricalFilters: (filters) =>
    set((state) => ({
      historicalFilters: { ...state.historicalFilters, ...filters },
    })),
  resetHistoricalFilters: () => set({ historicalFilters: DEFAULT_HISTORICAL_FILTERS }),

  compareFilters: DEFAULT_COMPARE_FILTERS,
  setCompareFilters: (filters) =>
    set((state) => ({
      compareFilters: { ...state.compareFilters, ...filters },
    })),
  resetCompareFilters: () => set({ compareFilters: DEFAULT_COMPARE_FILTERS }),

  bestFilters: DEFAULT_BEST_FILTERS,
  setBestFilters: (filters) =>
    set((state) => ({
      bestFilters: { ...state.bestFilters, ...filters },
    })),
  resetBestFilters: () => set({ bestFilters: DEFAULT_BEST_FILTERS }),

  selectedCurrencies: ['USD', 'EUR', 'GBP'],
  setSelectedCurrencies: (currencies) => set({ selectedCurrencies: currencies }),
  toggleCurrency: (currency) =>
    set((state) => ({
      selectedCurrencies: state.selectedCurrencies.includes(currency)
        ? state.selectedCurrencies.filter((c) => c !== currency)
        : [...state.selectedCurrencies, currency],
    })),
}));
