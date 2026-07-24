"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import type { ItemStepRecord } from "@/modules/quotations/repositories/production-step-repository";

export type ItemStepDto = ItemStepRecord;

/** Production steps of one JO item (loaded while the item modal is open). */
export function useItemSteps(jobOrderItemId: string | null) {
  return useQuery({
    queryKey: ["item-steps", jobOrderItemId],
    queryFn: () =>
      fetchJson<ItemStepDto[]>(
        `/api/job-orders/items/${jobOrderItemId}/steps`
      ),
    enabled: jobOrderItemId !== null,
  });
}

export function useToggleItemStep(jobOrderItemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stepId: string; done: boolean }) =>
      fetchJson<null>(`/api/job-orders/items/${jobOrderItemId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-steps", jobOrderItemId] });
      queryClient.invalidateQueries({ queryKey: ["job-orders"] });
    },
  });
}

/** Per-step status histories of one JO item: { [stepId]: historyText|null }. */
export function useStepHistories(jobOrderItemId: string | null) {
  return useQuery({
    queryKey: ["step-histories", jobOrderItemId],
    queryFn: () =>
      fetchJson<Record<string, string | null>>(
        `/api/job-orders/items/${jobOrderItemId}/step-status`
      ),
    enabled: jobOrderItemId !== null,
  });
}

/** Post a status update onto one production step (per-step history). */
export function useAddStepStatus(jobOrderItemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stepId: string; remark: string }) =>
      fetchJson<null>(`/api/job-orders/items/${jobOrderItemId}/step-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["step-histories", jobOrderItemId] });
    },
  });
}

/** Backfill: copy the product's current workflow onto this item (for items
 *  created before the template was defined). */
export function useApplyItemWorkflow(jobOrderItemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ count: number }>(
        `/api/job-orders/items/${jobOrderItemId}/steps`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-steps", jobOrderItemId] });
    },
  });
}
