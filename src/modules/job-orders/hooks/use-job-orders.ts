"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type {
  ImportSummaryDto,
  JobOrderListPageDto,
} from "../schemas/job-order";

export type JobOrderListParams = { q: string; view: string };

export function useJobOrdersInfinite(params: JobOrderListParams) {
  return useInfiniteQuery({
    queryKey: ["job-orders", params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams({ view: params.view });
      if (params.q) search.set("q", params.q);
      if (pageParam) search.set("cursor", pageParam);
      return fetchJson<JobOrderListPageDto>(`/api/job-orders?${search}`);
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useInvalidateJobOrders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["job-orders"] });
}

export function useImportLegacyCsv() {
  const invalidate = useInvalidateJobOrders();
  return useMutation({
    mutationFn: async (input: { file: File; source: "lineup" | "archive" }) => {
      const form = new FormData();
      form.set("file", input.file);
      form.set("source", input.source);
      return fetchJson<ImportSummaryDto>("/api/job-orders/import", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => invalidate(),
  });
}
