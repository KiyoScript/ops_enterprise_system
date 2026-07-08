import { Badge } from "@/components/ui/badge";

/** Row-level chip for a JO's lifecycle + legacy overdue/waiting flags. */
export function JoStatusBadge({
  status,
  isOverdue,
  hasWaitingPickup,
}: {
  status: string;
  isOverdue: boolean;
  hasWaitingPickup: boolean;
}) {
  if (status === "COMPLETED") return <Badge variant="secondary">Completed</Badge>;
  if (status === "CANCELLED") return <Badge variant="ghost">Cancelled</Badge>;
  if (isOverdue) return <Badge variant="destructive">Overdue</Badge>;
  if (hasWaitingPickup) return <Badge variant="outline">Waiting pickup</Badge>;
  return <Badge variant="outline">In progress</Badge>;
}

/** Item-level chip showing the production status text. */
export function ItemStatusBadge({
  productionStatus,
  isDone,
  isWaitingPickup,
  isOverdue,
}: {
  productionStatus: string | null;
  isDone: boolean;
  isWaitingPickup: boolean;
  isOverdue: boolean;
}) {
  const label = productionStatus ?? "No status";
  if (isDone) return <Badge variant="secondary">{label}</Badge>;
  if (isOverdue) return <Badge variant="destructive">{label}</Badge>;
  if (isWaitingPickup) return <Badge variant="outline">{label}</Badge>;
  return <Badge variant="ghost">{label}</Badge>;
}
