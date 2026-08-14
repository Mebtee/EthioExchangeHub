import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState, ErrorState } from "@/components/shared/async-states";
import { TableRowsSkeleton } from "@/components/shared/skeletons";
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
  const { t } = useTranslation();

  if (isLoading) {
    return <TableRowsSkeleton rows={6} columns={columns.length} />;
  }

  if (isError) {
    return (
      <ErrorState
        title={t("admin.dataTable.unableToLoad")}
        message={errorMessage ?? t("admin.dataTable.errorMessage")}
        onRetry={onRetry}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState title={emptyTitle ?? t("admin.dataTable.noRecords")} message={emptyMessage} />
    );
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
