import type { ReactNode } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  footer?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  emptyTitle,
  emptyMessage,
  footer,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState label="Loading data…" hint="Fetching records from the admin service." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Unable to load data"
        message={errorMessage ?? "Something went wrong while contacting the service."}
        onRetry={onRetry}
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle ?? "No records found"} message={emptyMessage} />;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {footer && (
        <div className="border-t border-border/60 px-6 py-4 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </>
  );
}
