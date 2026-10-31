"use client";

import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  page: number;
  pageSize?: number;
  total: number;
  loading?: boolean;
  emptyMessage?: string;
  onPageChange?: (page: number) => void;
  getRowId?: (row: T, index: number) => string;
};

export function DataTable<T>({
  columns,
  rows,
  page,
  pageSize = 25,
  total,
  loading = false,
  emptyMessage = "No results found.",
  onPageChange,
  getRowId,
}: DataTableProps<T>) {
  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const safePage = Math.min(
    Math.max(page, 1),
    totalPages
  );

  const start =
    total === 0 ? 0 : (safePage - 1) * pageSize + 1;

  const end = Math.min(
    safePage * pageSize,
    total
  );

  return (
    <div className="w-full min-w-0 space-y-3">
      {/* Contain horizontal scrolling inside the table */}
      <div className="w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={column.className}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 5) }).map(
                (_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={
                    getRowId?.(row, index) ??
                    `row-${index}`
                  }
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={column.className}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading results..."
            : `Showing ${start}-${end} of ${total}`}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={
              loading ||
              safePage <= 1 ||
              !onPageChange
            }
            onClick={() => onPageChange?.(safePage - 1)}
          >
            Previous
          </Button>

          <span className="whitespace-nowrap text-sm">
            Page {safePage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={
              loading ||
              safePage >= totalPages ||
              !onPageChange
            }
            onClick={() => onPageChange?.(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}