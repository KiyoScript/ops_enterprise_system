"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDrMetrics } from "../hooks/use-delivery-receipts";

// Quick-decision cards: what still needs delivering, and issuance activity.
const CARDS: {
  key: "pendingDeliveries" | "issuedToday" | "issuedThisMonth" | "partialThisMonth";
  label: string;
  sub: string;
  dot: string;
}[] = [
  { key: "pendingDeliveries", label: "Pending delivery", sub: "JOs with undelivered items", dot: "#E24B4A" },
  { key: "issuedToday", label: "Issued today", sub: "delivery receipts", dot: "#378ADD" },
  { key: "issuedThisMonth", label: "Issued this month", sub: "delivery receipts", dot: "#2E9E5B" },
  { key: "partialThisMonth", label: "Partial this month", sub: "incomplete orders", dot: "#BA7517" },
];

export function DrMetrics() {
  const metrics = useDrMetrics();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => (
        <div key={card.key} className="grid gap-1 rounded-xl border bg-card p-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: card.dot }} />
            {card.label}
          </span>
          {metrics.isPending ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums",
                card.key === "pendingDeliveries" &&
                  (metrics.data?.pendingDeliveries ?? 0) > 0 &&
                  "text-red-600 dark:text-red-400"
              )}
            >
              {metrics.data?.[card.key] ?? "—"}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}
