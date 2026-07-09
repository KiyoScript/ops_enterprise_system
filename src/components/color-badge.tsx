import { cn } from "@/lib/utils";

// Colored chip for categorical values (statuses, teams, categories).
// Semantic tones cover the legacy meanings (green done, amber waiting,
// red overdue, blue ongoing); everything else gets a stable color hashed
// from its text so different values are visually distinct.

export type BadgeTone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "purple"
  | "gray"
  | "auto";

const TONE_CLASSES: Record<Exclude<BadgeTone, "auto">, string> = {
  green:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  purple:
    "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  gray: "bg-muted text-muted-foreground",
};

// Hash palette avoids the semantic colors above (no green/red/amber) so a
// random status never masquerades as done/overdue/waiting.
const HASH_PALETTE = [
  "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
];

function hashedClasses(label: string): string {
  let hash = 0;
  const normalized = label.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return HASH_PALETTE[Math.abs(hash) % HASH_PALETTE.length]!;
}

export function ColorBadge({
  label,
  tone = "auto",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  const toneClasses =
    tone === "auto" ? hashedClasses(label) : TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-5.5 w-fit shrink-0 items-center rounded-4xl px-2 text-xs font-medium whitespace-nowrap",
        toneClasses,
        className
      )}
    >
      {label}
    </span>
  );
}
