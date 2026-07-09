"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type SuggestOption = string | { value: string; label: string };

/**
 * Text input with a styled suggestion popup (replaces native <datalist>,
 * which browsers render unstyled). Free text is always allowed — the options
 * come from the Maintenance lists but don't restrict input. Object options
 * display `label` in the popup but insert `value` (e.g. employee code shown
 * with the name, code stored).
 */
export function SuggestInput({
  value,
  onChange,
  options,
  placeholder,
  id,
  invalid,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SuggestOption[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);

  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const trimmed = value.trim().toLowerCase();
  const filtered = trimmed
    ? normalized.filter(
        (o) =>
          o.value.toLowerCase() !== trimmed &&
          (o.label.toLowerCase().includes(trimmed) ||
            o.value.toLowerCase().includes(trimmed))
      )
    : normalized;
  const open = focused && filtered.length > 0;

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setFocused(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={invalid}
        role="combobox"
        aria-expanded={open}
        className="pr-8"
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      {open && (
        <ul className="absolute z-40 mt-1 max-h-56 w-full min-w-44 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
                // onMouseDown so it fires before the input's blur
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option.value);
                  setFocused(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
