"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  // Column has its own click targets (buttons, selects) that shouldn't also
  // trigger the row's onRowClick — e.g. quick-action/appearance cells.
  stopRowClick?: boolean;
};

export type DataTableFilter<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
};

const DEFAULT_PAGE_SIZE = 10;

// Small, dependency-free table with a text search, optional Select filters,
// click-to-sort headers, a serial-number column, and pagination — enough for
// every list-shaped view in the app (admin, shop management, and the
// customer-facing shop listing) without pulling in @tanstack/react-table.
export function DataTable<T extends { id: string }>({
  columns,
  data,
  filters = [],
  searchPlaceholder = "Search…",
  searchValue,
  emptyMessage = "No results.",
  onRowClick,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  filters?: DataTableFilter<T>[];
  searchPlaceholder?: string;
  searchValue: (row: T) => string;
  emptyMessage?: string;
  // Opens a details view for the row — see components/admin/*-detail-modal.tsx.
  onRowClick?: (row: T) => void;
  pageSize?: number;
}) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null,
  );
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    let result = data;

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => searchValue(row).toLowerCase().includes(q));
    }

    for (const filter of filters) {
      const value = filterValues[filter.key];
      if (value && value !== "ALL") {
        result = result.filter((row) => filter.predicate(row, value));
      }
    }

    if (sort) {
      const column = columns.find((c) => c.key === sort.key);
      if (column?.sortValue) {
        const dir = sort.dir === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
          const av = column.sortValue!(a);
          const bv = column.sortValue!(b);
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }

    return result;
  }, [data, search, filterValues, filters, sort, columns, searchValue]);

  // A new search/filter/sort can shrink the result set out from under
  // whatever page the user was on — snap back to page 1 rather than render
  // an empty page 4 of 1. Adjusting state directly during render (guarded by
  // comparing against the previous value) instead of an effect — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  const resetSignature = `${search}|${JSON.stringify(filterValues)}|${sort ? `${sort.key}:${sort.dir}` : ""}`;
  const [trackedSignature, setTrackedSignature] = useState(resetSignature);
  const [trackedData, setTrackedData] = useState(data);
  if (resetSignature !== trackedSignature || data !== trackedData) {
    setTrackedSignature(resetSignature);
    setTrackedData(data);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-56"
        />
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filterValues[filter.key] ?? "ALL"}
            onValueChange={(value) =>
              setFilterValues((prev) => ({ ...prev, [filter.key]: value ?? "ALL" }))
            }
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{filter.label}: All</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() =>
                        setSort((prev) =>
                          prev?.key === column.key
                            ? { key: column.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { key: column.key, dir: "asc" },
                        )
                      }
                    >
                      {column.header}
                      <ArrowUpDown className="size-3" />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-6 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  <TableCell className="text-muted-foreground">
                    {startIndex + i + 1}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      onClick={column.stopRowClick ? (e) => e.stopPropagation() : undefined}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {startIndex + 1}–{Math.min(startIndex + pageSize, rows.length)} of{" "}
            {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
