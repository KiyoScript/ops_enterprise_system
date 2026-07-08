"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/data-states";
import {
  createLookupAction,
  deleteLookupAction,
  updateLookupAction,
} from "@/app/(app)/maintenance/job-orders/actions";
import type { LookupDto, LookupTypeInput } from "../schemas/lookup";

/** One maintained list (legacy DatabaseLink sheet equivalent): add, rename
 *  via re-add, activate/deactivate, delete. */
export function LookupManager({
  type,
  title,
  description,
  items,
  withLFP = false,
}: {
  type: LookupTypeInput;
  title: string;
  description: string;
  items: LookupDto[];
  withLFP?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [isLFP, setIsLFP] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<LookupDto | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["lookups", type] });
    router.refresh();
  };

  const add = () => {
    if (!label.trim()) {
      toast.error("Enter a value first.");
      return;
    }
    startTransition(async () => {
      const result = await createLookupAction({
        type,
        label: label.trim(),
        isLFP: withLFP ? isLFP : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added "${result.data.label}".`);
      setLabel("");
      setIsLFP(false);
      refresh();
    });
  };

  const toggleActive = (item: LookupDto) => {
    startTransition(async () => {
      const result = await updateLookupAction({
        id: item.id,
        isActive: !item.isActive,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      refresh();
    });
  };

  const remove = (item: LookupDto) => {
    startTransition(async () => {
      const result = await deleteLookupAction({ id: item.id });
      setConfirmDelete(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${item.label}".`);
      refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={`Add to ${title.toLowerCase()}…`}
            className="max-w-72"
            aria-label={`New ${title} entry`}
          />
          {withLFP && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={isLFP}
                onChange={(e) => setIsLFP(e.target.checked)}
              />
              LFP (large format)
            </label>
          )}
          <Button size="sm" onClick={add} disabled={pending}>
            <PlusIcon /> Add
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Entries you add appear in the matching dropdowns right away."
          />
        ) : (
          <ul className="grid gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <span className={item.isActive ? "" : "text-muted-foreground line-through"}>
                  {item.label}
                </span>
                {withLFP && item.isLFP && <Badge variant="outline">LFP</Badge>}
                {!item.isActive && <Badge variant="ghost">inactive</Badge>}
                <span className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => toggleActive(item)}
                    disabled={pending}
                  >
                    {item.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Delete ${item.label}`}
                    onClick={() => setConfirmDelete(item)}
                    disabled={pending}
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{confirmDelete?.label}”?</DialogTitle>
            <DialogDescription>
              Existing job orders keep the text they already have — this only
              removes it from the dropdown. Deactivate instead if you may need
              it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && remove(confirmDelete)}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
