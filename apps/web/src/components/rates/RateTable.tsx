'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, formatRate, formatTimeAgo, calculateSpread } from '@/lib/utils';
import type { RateRecord } from '@/lib/types';

interface RateTableProps {
  data: RateRecord[];
  isLoading?: boolean;
  onRowClick?: (rate: RateRecord) => void;
  compact?: boolean;
}

export function RateTable({ data, isLoading, onRowClick, compact }: RateTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<RateRecord>[]>(
    () => [
      {
        accessorKey: 'bankName',
        header: 'Bank',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {row.original.bankCode}
            </div>
            <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
              {row.original.bankName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'currencyTo',
        header: 'Currency',
        cell: ({ row }) => (
          <span className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>
            {row.original.currencyTo}
          </span>
        ),
      },
      {
        accessorKey: 'buyRate',
        header: 'Buy Rate',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
            {formatRate(row.original.buyRate)}
          </span>
        ),
      },
      {
        accessorKey: 'sellRate',
        header: 'Sell Rate',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
            {formatRate(row.original.sellRate)}
          </span>
        ),
      },
      {
        id: 'spread',
        header: 'Spread',
        cell: ({ row }) => {
          const spread = calculateSpread(row.original.buyRate, row.original.sellRate);
          return (
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
              {formatRate(spread)}
            </span>
          );
        },
      },
      {
        accessorKey: 'effectiveDate',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimeAgo(row.original.effectiveDate)}
          </span>
        ),
      },
    ],
    [compact],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No exchange rates found</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
                    header.column.getCanSort() && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: <ArrowUp className="h-3 w-3" />,
                      desc: <ArrowDown className="h-3 w-3" />,
                    }[header.column.getIsSorted() as string] ?? (
                      header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900',
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
