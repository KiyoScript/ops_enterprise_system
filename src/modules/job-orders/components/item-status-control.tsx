"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestInput } from "@/components/suggest-input";
import { useLookupOptions } from "@/modules/shared/hooks/use-lookups";
import { updateItemStatusAction } from "@/app/(app)/job-orders/actions";
import { useInvalidateJobOrders } from "../hooks/use-job-orders";
import { PRODUCTION_STATUS_SUGGESTIONS } from "../services/production-status";

/** Inline per-item status updater — the day-to-day maintenance action. */
export function ItemStatusControl({
  jobOrderId,
  itemId,
  currentStatus,
}: {
  jobOrderId: string;
  itemId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const invalidate = useInvalidateJobOrders();
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [pending, startTransition] = useTransition();
  const statusLookups = useLookupOptions("JO_STATUS");
  const statusOptions = statusLookups.data?.length
    ? statusLookups.data.map((o) => o.label)
    : [...PRODUCTION_STATUS_SUGGESTIONS];

  const save = () => {
    if (!status.trim()) {
      toast.error("Enter the new status first.");
      return;
    }
    startTransition(async () => {
      const result = await updateItemStatusAction({
        jobOrderId,
        itemId,
        productionStatus: status.trim(),
        remark: remark.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      setStatus("");
      setRemark("");
      invalidate();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SuggestInput
        value={status}
        onChange={setStatus}
        options={statusOptions}
        placeholder={currentStatus ?? "New status…"}
        className="w-56"
      />
      <Input
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="Remark (optional)"
        className="max-w-40"
        aria-label="Status remark"
      />
      <Button size="sm" variant="outline" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Update"}
      </Button>
    </div>
  );
}
