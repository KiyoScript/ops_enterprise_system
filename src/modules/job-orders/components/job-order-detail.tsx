"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, ZapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteJobOrderAction } from "@/app/(app)/job-orders/actions";
import type { JobOrderDetailDto } from "../schemas/job-order";
import { ItemStatusBadge, JoStatusBadge } from "./status-badge";
import { ItemStatusControl } from "./item-status-control";

export function JobOrderDetail({
  jo,
  canWrite,
  canDelete,
}: {
  jo: JobOrderDetailDto;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const anyOverdue = jo.items.some((i) => i.isOverdue);
  const anyWaiting = jo.items.some((i) => i.isWaitingPickup);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {jo.joNumber}
          </h1>
          <JoStatusBadge
            status={jo.status}
            isOverdue={anyOverdue}
            hasWaitingPickup={anyWaiting}
          />
          {jo.imported && <Badge variant="ghost">imported</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/job-orders/${jo.id}/edit`} />}
            >
              <PencilIcon /> Edit
            </Button>
          )}
          {canDelete && <DeleteButton id={jo.id} joNumber={jo.joNumber} />}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer" value={jo.customer.name} />
          <Field label="Total" value={formatMoney(jo.total)} />
          <Field
            label="Deadline"
            value={jo.deadline ? format(new Date(jo.deadline), "MMMM d, yyyy") : "—"}
          />
          <Field
            label="Created"
            value={`${format(new Date(jo.createdAt), "M/d/yyyy")} by ${jo.createdByName}`}
          />
          <Field
            label="Plan window"
            value={
              jo.planDateStart || jo.planDateEnd
                ? `${jo.planDateStart ? format(new Date(jo.planDateStart), "M/d/yyyy") : "…"} – ${jo.planDateEnd ? format(new Date(jo.planDateEnd), "M/d/yyyy") : "…"}`
                : "—"
            }
          />
          <Field
            label="Completed"
            value={
              jo.completedAt
                ? format(new Date(jo.completedAt), "M/d/yyyy")
                : "—"
            }
          />
          {jo.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Notes" value={jo.notes} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Items ({jo.items.filter((i) => !i.isDone).length} open /{" "}
            {jo.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {jo.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-1">
                  <p className="whitespace-pre-wrap text-sm font-medium">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.lineItemId ?? ""} · Qty {item.qty} ·{" "}
                    {formatMoney(item.lineTotal)}
                    {item.category ? ` · ${item.category}` : ""}
                    {item.isLFP
                      ? ` · LFP ${item.lfpWidth ?? "?"}×${item.lfpHeight ?? "?"} ${item.lfpUnit ?? ""}`
                      : ""}
                    {item.assignedTo ? ` · ${item.assignedTo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.isRush && (
                    <Badge variant="destructive">
                      <ZapIcon /> Rush
                    </Badge>
                  )}
                  <ItemStatusBadge
                    productionStatus={item.productionStatus}
                    isDone={item.isDone}
                    isWaitingPickup={item.isWaitingPickup}
                    isOverdue={item.isOverdue}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {item.deadline
                  ? `Deadline ${format(new Date(item.deadline), "M/d/yyyy")}` +
                    (item.isDone
                      ? ""
                      : item.daysLeft !== null
                        ? ` (${item.daysLeft >= 0 ? `${item.daysLeft} day(s) left` : `${-item.daysLeft} day(s) overdue`})`
                        : "")
                  : "No deadline"}
                {item.actualDate
                  ? ` · Finished ${format(new Date(item.actualDate), "M/d/yyyy")}`
                  : ""}
                {item.waitingPickupSince
                  ? ` · Waiting for pickup since ${format(new Date(item.waitingPickupSince), "M/d/yyyy")}`
                  : ""}
              </p>

              {item.statusHistory && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Status history
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 font-sans text-muted-foreground">
                    {item.statusHistory}
                  </pre>
                </details>
              )}

              {canWrite && (
                <ItemStatusControl
                  jobOrderId={jo.id}
                  itemId={item.id}
                  currentStatus={item.productionStatus}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function DeleteButton({ id, joNumber }: { id: string; joNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await deleteJobOrderAction({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${joNumber} deleted.`);
      router.push("/job-orders");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon /> Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {joNumber}?</DialogTitle>
          <DialogDescription>
            The job order is soft-deleted: it disappears from every list but
            stays in the database for traceability.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatMoney(value: string): string {
  const n = parseFloat(value);
  return isNaN(n)
    ? value
    : `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}
