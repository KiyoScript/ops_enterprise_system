"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type {
  DeliverableJoDto,
  DrDetailDto,
  DrListPageDto,
} from "../schemas/delivery-receipt";

export function useDrList(q: string) {
  return useInfiniteQuery({
    queryKey: ["delivery-receipts", q],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (q) search.set("q", q);
      if (pageParam) search.set("cursor", pageParam);
      return fetchJson<DrListPageDto>(`/api/delivery-receipts?${search}`);
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Completed JO items still to deliver (issue picker). Pass `null` to fetch
 *  every deliverable JO, `undefined` to disable the query. */
export function useDeliverable(jobOrderId: string | null | undefined) {
  return useQuery({
    queryKey: ["delivery-receipts", "deliverable", jobOrderId ?? "all"],
    queryFn: () =>
      fetchJson<DeliverableJoDto[]>(
        `/api/delivery-receipts/deliverable${jobOrderId ? `?jobOrderId=${jobOrderId}` : ""}`
      ),
    enabled: jobOrderId !== undefined,
  });
}

export function useDrDetail(id: string | null) {
  return useQuery({
    queryKey: ["delivery-receipts", "detail", id],
    queryFn: () => fetchJson<DrDetailDto>(`/api/delivery-receipts/${id}`),
    enabled: id !== null,
  });
}

export function useInvalidateDrs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["delivery-receipts"] });
}
