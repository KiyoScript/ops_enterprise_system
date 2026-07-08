"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useCustomerSearch } from "@/modules/shared/hooks/use-customer-search";

/**
 * Free-text customer field with suggestions from the customer master.
 * Typing a brand-new name is allowed — the service quick-creates the
 * customer on save (no separate Customers page needed yet).
 */
export function CustomerCombobox({
  value,
  onChange,
  invalid,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  const [focused, setFocused] = useState(false);
  const search = useCustomerSearch(value);
  const options = (search.data ?? []).filter(
    (o) => o.name.toLowerCase() !== value.trim().toLowerCase()
  );
  const open = focused && value.trim().length >= 2 && options.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Type a customer name…"
        autoComplete="off"
        aria-invalid={invalid}
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <ul className="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-lg bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
                // onMouseDown so it fires before the input's blur
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option.name);
                  setFocused(false);
                }}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
