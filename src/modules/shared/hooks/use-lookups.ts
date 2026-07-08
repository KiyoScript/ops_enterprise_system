"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { LookupDto, LookupTypeInput } from "../schemas/lookup";

/** Active options of one Maintenance list, for pickers. */
export function useLookupOptions(type: LookupTypeInput) {
  return useQuery({
    queryKey: ["lookups", type],
    queryFn: () => fetchJson<LookupDto[]>(`/api/lookups?type=${type}`),
    staleTime: 60_000,
  });
}
