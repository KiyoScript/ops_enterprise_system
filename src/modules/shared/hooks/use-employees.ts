"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { EmployeeDto } from "../schemas/employee";

/** Active employees for the assigned-to picker. */
export function useEmployeeOptions() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchJson<EmployeeDto[]>("/api/employees"),
    staleTime: 60_000,
  });
}
