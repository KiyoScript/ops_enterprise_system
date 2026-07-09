import { ColorBadge, type BadgeTone } from "@/components/color-badge";
import {
  isDoneStatus,
  isWaitingPickupStatus,
} from "../services/production-status";

// Legacy color semantics: green done, amber waiting-pickup, red overdue,
// blue ongoing; other statuses get their own stable hashed color.

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
  if (status === "COMPLETED") return <ColorBadge tone="green" label="Completed" />;
  if (status === "CANCELLED") return <ColorBadge tone="gray" label="Cancelled" />;
  if (isOverdue) return <ColorBadge tone="red" label="Overdue" />;
  if (hasWaitingPickup) return <ColorBadge tone="amber" label="Waiting pickup" />;
  return <ColorBadge tone="blue" label="In progress" />;
}

const ONGOING_KEYWORDS = ["ongoing", "in progress", "in-progress", "running"];

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

  let tone: BadgeTone = "auto";
  if (isDone || isDoneStatus(productionStatus)) tone = "green";
  else if (isOverdue) tone = "red";
  else if (isWaitingPickup || isWaitingPickupStatus(productionStatus))
    tone = "amber";
  else if (!productionStatus) tone = "gray";
  else if (
    ONGOING_KEYWORDS.some((kw) => productionStatus.toLowerCase().includes(kw))
  )
    tone = "blue";

  return <ColorBadge tone={tone} label={label} />;
}
