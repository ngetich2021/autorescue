"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
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

// Small, dependency-free table with a text search, optional Select filters,
// and click-to-sort headers — enough for the admin panel's list-shaped tabs
// without pulling in @tanstack/react-table.
export function DataTable<T extends { id: string }>({
  columns,
  data,
  filters = [],
  searchPlaceholder = "Search…",
  searchValue,
  emptyMessage = "No results.",
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  filters?: DataTableFilter<T>[];
  searchPlaceholder?: string;
  searchValue: (row: T) => string;
  emptyMessage?: string;
  // Opens a details view for the row — see components/admin/*-detail-modal.tsx.
  onRowClick?: (row: T) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null,
  );

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-6 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
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
    </div>
  );
}
