"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useJoBoardMetrics } from "../hooks/use-job-orders";
import type { BoardMetricsDto } from "../schemas/job-order";

// Card definitions ported from legacy JO_METRICS (JobOrder.html) — same
// labels, dot colors, and order. Clicking a card filters the list below.
const CARDS: {
  key: keyof BoardMetricsDto;
  view: string;
  label: string;
  sub?: string;
  dot: string;
}[] = [
  { key: "all", view: "active", label: "All items", dot: "#888780" },
  { key: "ongoing", view: "ongoing", label: "Ongoing", dot: "#378ADD" },
  { key: "waiting", view: "waiting", label: "Waiting for pickup", dot: "#BA7517" },
  { key: "overdue", view: "overdue", label: "Overdue", dot: "#E24B4A" },
  {
    key: "custApproval",
    view: "custApproval",
    label: "Customers Approval",
    sub: "awaiting approval",
    dot: "#8B5CF6",
  },
  {
    key: "smAlarming",
    view: "smAlarming",
    label: "S&M Alarming",
    sub: "due in ≤3 days",
    dot: "#F59E0B",
  },
  {
    key: "smOverdue",
    view: "smOverdue",
    label: "S&M Overdue",
    sub: "past deadline",
    dot: "#E24B4A",
  },
];

export function BoardMetrics({
  activeView,
  onSelect,
}: {
  activeView: string;
  onSelect: (view: string) => void;
}) {
  const metrics = useJoBoardMetrics();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {CARDS.map((card) => {
        const active = activeView === card.view;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.view)}
            aria-pressed={active}
            className={cn(
              "grid gap-1 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50",
              active && "border-primary ring-1 ring-primary"
            )}
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: card.dot }}
              />
              {card.label}
            </span>
            {metrics.isPending ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <span className="text-2xl font-semibold tabular-nums">
                {metrics.data?.[card.key] ?? "—"}
              </span>
            )}
            {card.sub && (
              <span className="text-xs text-muted-foreground">{card.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
