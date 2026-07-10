"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/data-states";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeInteger } from "@/lib/form-numeric";
import { issueDrAction } from "@/app/(app)/delivery-receipts/actions";
import { useDeliverable, useInvalidateDrs } from "../hooks/use-delivery-receipts";

const peso = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? v : `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

export function IssueDrDialog() {
  const router = useRouter();
  const invalidate = useInvalidateDrs();
  const [open, setOpen] = useState(false);
  const [jobOrderId, setJobOrderId] = useState<string | null>(null);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  // All deliverable JOs (for the picker); once a JO is chosen we filter to it.
  const deliverable = useDeliverable(open ? null : undefined);
  const groups = useMemo(() => deliverable.data ?? [], [deliverable.data]);
  const selected = useMemo(
    () => groups.find((g) => g.jobOrderId === jobOrderId) ?? null,
    [groups, jobOrderId]
  );

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setJobOrderId(null);
      setQtys({});
      setNotes("");
    }
  };

  const pickJo = (id: string) => {
    setJobOrderId(id);
    const g = groups.find((x) => x.jobOrderId === id);
    // Prefill each line with its full remaining quantity (deliver-all default).
    const next: Record<string, string> = {};
    for (const item of g?.items ?? []) next[item.id] = String(item.remaining);
    setQtys(next);
  };

  const submit = () => {
    if (!selected) {
      toast.error("Pick a job order first.");
      return;
    }
    const lines = selected.items
      .map((i) => ({ jobOrderItemId: i.id, qty: qtys[i.id] ?? "0" }))
      .filter((l) => parseInt(l.qty, 10) > 0);
    if (lines.length === 0) {
      toast.error("Enter a quantity to deliver on at least one line.");
      return;
    }
    startTransition(async () => {
      const result = await issueDrAction({
        jobOrderId: selected.jobOrderId,
        notes: notes.trim() || undefined,
        lines,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Delivery receipt issued.");
      invalidate();
      router.refresh();
      reset(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> Issue DR
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue Delivery Receipt</DialogTitle>
          <DialogDescription>
            Pick a completed job order, then set the quantity to deliver per
            line (partial allowed).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Job order</Label>
            {deliverable.isPending ? (
              <Skeleton className="h-8 w-full" />
            ) : groups.length === 0 ? (
              <EmptyState
                title="Nothing to deliver"
                description="A JO's items appear here once they're marked done and still have undelivered quantity."
              />
            ) : (
              <Select
                value={jobOrderId ?? ""}
                onValueChange={(v) => v && pickJo(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a completed JO…" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.jobOrderId} value={g.jobOrderId}>
                      {g.joNumber} — {g.customerName} ({g.items.length} item
                      {g.items.length !== 1 ? "s" : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selected && (
            <>
              <div className="grid gap-2 rounded-lg border p-3">
                <div className="text-sm font-medium">{selected.customerName}</div>
                {selected.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{item.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.lineItemId} · ordered {item.qty} · delivered{" "}
                        {item.qtyDelivered} · {peso(item.unitPrice)}/pc
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`dr-qty-${item.id}`} className="text-xs">
                        Deliver
                      </Label>
                      <Input
                        id={`dr-qty-${item.id}`}
                        inputMode="numeric"
                        value={qtys[item.id] ?? ""}
                        onChange={(e) => {
                          const clean = sanitizeInteger(e.target.value);
                          const capped =
                            clean === ""
                              ? ""
                              : String(Math.min(parseInt(clean, 10), item.remaining));
                          setQtys((q) => ({ ...q, [item.id]: capped }));
                        }}
                        className="h-8 w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                        / {item.remaining} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-notes">Notes</Label>
                <Textarea
                  id="dr-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={pending || !selected}>
            {pending ? "Issuing…" : "Issue DR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
