"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";
import { format } from "date-fns";
import { PlusIcon, ZapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/data-states";
import { useDebounce } from "@/modules/shared/hooks/use-debounce";
import { useJobOrdersInfinite } from "../hooks/use-job-orders";
import { ImportDialog } from "./import-dialog";
import { JoStatusBadge } from "./status-badge";

const VIEWS = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "waiting", label: "Waiting pickup" },
  { value: "done", label: "Completed" },
  { value: "all", label: "All" },
] as const;

const COLS = 7;

export function JobOrdersView({
  canWrite,
  canImport,
}: {
  canWrite: boolean;
  canImport: boolean;
}) {
  // Filters live in the URL so views are shareable and back-button friendly.
  const [q, setQ] = useQueryState("q", { defaultValue: "" });
  const [view, setView] = useQueryState("view", { defaultValue: "active" });
  const debouncedQ = useDebounce(q);

  const query = useJobOrdersInfinite({ q: debouncedQ, view });
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search JO # or customer…"
          className="max-w-64"
          aria-label="Search job orders"
        />
        <Select value={view} onValueChange={(value) => setView(value as string)}>
          <SelectTrigger aria-label="Filter view">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            {VIEWS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          {canImport && <ImportDialog />}
          {canWrite && (
            <Button nativeButton={false} render={<Link href="/job-orders/new" />}>
              <PlusIcon /> New Job Order
            </Button>
          )}
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JO #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <TableSkeletonRows cols={COLS} />
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={COLS}>
                    <ErrorState
                      message={query.error.message}
                      onRetry={() => query.refetch()}
                    />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS}>
                    <EmptyState
                      title="No job orders here yet"
                      description={
                        view === "active"
                          ? "Create a job order or import your legacy data to get started."
                          : "Nothing matches this view."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/job-orders/${row.id}`}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        {row.joNumber}
                        {row.isRush && (
                          <ZapIcon className="size-3.5 text-destructive" aria-label="Rush" />
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.status === "COMPLETED"
                        ? row.itemCount
                        : `${row.openItemCount} open / ${row.itemCount}`}
                    </TableCell>
                    <TableCell>
                      <JoStatusBadge
                        status={row.status}
                        isOverdue={row.isOverdue}
                        hasWaitingPickup={row.hasWaitingPickup}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.total)}
                    </TableCell>
                    <TableCell
                      className={row.isOverdue ? "text-destructive" : undefined}
                    >
                      {row.deadline
                        ? format(new Date(row.deadline), "M/d/yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {format(new Date(row.createdAt), "M/d/yyyy")}
                        {row.imported && (
                          <Badge variant="ghost" className="text-[10px]">
                            imported
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="justify-self-center"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}

function formatMoney(value: string): string {
  const n = parseFloat(value);
  return isNaN(n)
    ? value
    : `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}
