"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ListChecksIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveProductionStepsAction } from "@/app/(app)/maintenance/quotations/actions";
import type { ProductOptionDto } from "@/modules/shared/hooks/use-products";

/** Per-product production-steps editor with the shop's REVERSE numbering —
 *  #1 is the LAST step (bottom), #2 the 2nd-to-last, … — consistent with the
 *  global workflow. Steps are stored/saved in workflow order (top → bottom =
 *  first → last); only the number LABEL counts from the end. "Add step" inserts
 *  a new EARLIER step at the top so the last step (#1) stays put (build the
 *  flow backward from delivery). Products with no steps of their own are
 *  pre-filled from the global workflow (see production-workflows-card). Saves
 *  through the shared production-steps action. */
export function ProductionStepsEditor({ product }: { product: ProductOptionDto }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<string[]>(product.productionSteps);
  const [pending, setPending] = useState(false);

  const reset = (next: boolean) => {
    setOpen(next);
    if (next) setSteps(product.productionSteps);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setSteps(next);
  };

  const save = async () => {
    const clean = steps.map((s) => s.trim()).filter(Boolean);
    setPending(true);
    const result = await saveProductionStepsAction({ productId: product.id, steps: clean });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Production steps saved.");
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Production steps for ${product.name}`}
          />
        }
      >
        <ListChecksIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Production steps — {product.name}</DialogTitle>
          <DialogDescription>
            The ordered workflow a job of this product goes through. Numbered
            from the end: <strong>#1 = the last step</strong> (bottom), #2 =
            2nd-to-last, … — same convention as the global workflow. Copied onto
            each JO item when a quotation converts; editing here won&apos;t
            change jobs already in production.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {steps.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No steps yet — add the last step (#1) first, then work backward.
            </p>
          )}
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-center text-sm font-medium text-muted-foreground tabular-nums">
                #{steps.length - i}
              </span>
              <Input
                value={step}
                onChange={(e) => {
                  const next = [...steps];
                  next[i] = e.target.value;
                  setSteps(next);
                }}
                placeholder="Step name"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUpIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move down"
                disabled={i === steps.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDownIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove step"
                onClick={() => setSteps(steps.filter((_, x) => x !== i))}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
          {/* New steps are EARLIER steps → prepend so the last step (#1) stays. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setSteps(["", ...steps])}
          >
            <PlusIcon /> Add earlier step
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save steps"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
