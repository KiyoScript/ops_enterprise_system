import { format } from "date-fns";

// Domain rules for per-item production tracking, ported 1:1 from the legacy
// JOWebApp (JobOrderCode.js) so imported data and new data behave identically.

/** Keep in sync with legacy DONE_KEYWORDS_ — a status containing any of these
 *  counts as finished and auto-archives the item. */
export const DONE_KEYWORDS = [
  "done",
  "completed",
  "delivered",
  "finished",
  "closed",
] as const;

export function isDoneStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return DONE_KEYWORDS.some((kw) => s.includes(kw));
}

/** Legacy rule: waiting-for-pickup items are excluded from "overdue". */
export function isWaitingPickupStatus(
  status: string | null | undefined
): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s.includes("pick up") || s.includes("pickup") || s.includes("delivery")
  );
}

/** "Status - Department" → department part (legacy col A derivation). */
export function departmentOf(status: string | null | undefined): string | null {
  if (!status || !status.includes(" - ")) return null;
  return status.split(" - ")[1]?.trim() || null;
}

/** Legacy timestamp prefix for status history lines, e.g. "4/23 2:30 PM". */
export function nowStamp(date = new Date()): string {
  return format(date, "M/d h:mm a");
}

/** Append a history line, stamping it unless it already starts with a date. */
export function appendHistory(
  oldHistory: string | null | undefined,
  entry: string,
  stamp = nowStamp()
): string {
  const line = /^\d{1,2}\//.test(entry.trim())
    ? entry.trim()
    : `${stamp} ${entry.trim()}`;
  const prev = (oldHistory ?? "").trim();
  return prev ? `${prev}\n${line}` : line;
}

/** Suggested statuses for the picker; free text is always allowed, like the
 *  legacy status list sheet. */
export const PRODUCTION_STATUS_SUGGESTIONS = [
  "For Layout - Graphics",
  "For Approval - Graphics",
  "Ongoing - Printing",
  "Ongoing - Production",
  "On Hold - Production",
  "Waiting - For Pick up / Delivery",
  "Done - Completed",
] as const;
