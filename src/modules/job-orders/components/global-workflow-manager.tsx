"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/data-states";
import {
  createGlobalStepAction,
  deleteGlobalStepAction,
  updateGlobalStepAction,
} from "@/app/(app)/maintenance/job-orders/actions";
import type { GlobalStepDto } from "../schemas/production-workflow";

/** The single global production workflow. Steps are ranked FROM THE END —
 *  #1 is the LAST step (e.g. "DR"), #2 the 2nd-to-last ("Capture"), … — so the
 *  shop defines the flow backward from delivery. Shown here in workflow order
 *  (first step at the top, last at the bottom). */
export function GlobalWorkflowManager({ items }: { items: GlobalStepDto[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRank, setEditRank] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const add = () => {
    if (!name.trim()) {
      toast.error("Enter a step name.");
      return;
    }
    if (!rank.trim()) {
      toast.error("Enter the position number (1 = last).");
      return;
    }
    startTransition(async () => {
      const result = await createGlobalStepAction({ name: name.trim(), rankFromEnd: rank });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added "${result.data.name}" (#${result.data.rankFromEnd} from end).`);
      setName("");
      setRank("");
      refresh();
    });
  };

  const startEdit = (item: GlobalStepDto) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditRank(String(item.rankFromEnd));
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editName.trim()) {
      toast.error("The step name can't be empty.");
      return;
    }
    startTransition(async () => {
      const result = await updateGlobalStepAction({
        id: editingId,
        name: editName.trim(),
        rankFromEnd: editRank,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Step saved.");
      setEditingId(null);
      refresh();
    });
  };

  const remove = (item: GlobalStepDto) => {
    if (!window.confirm(`Delete step "${item.name}"? In-flight job orders keep their copied steps.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteGlobalStepAction({ id: item.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${item.name}" deleted.`);
      refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production workflow</CardTitle>
        <CardDescription>
          The single ordered list of steps every job order moves through. Each
          step&apos;s number is its position <strong>from the end</strong>:
          <strong> 1 = the last step</strong> (e.g. DR), 2 = 2nd-to-last
          (Capture), and so on. Steps are copied onto a JO item when it&apos;s
          created; later edits here don&apos;t touch in-flight jobs.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="gw-name" className="text-xs">Step name</Label>
            <Input
              id="gw-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="e.g. DR"
              className="w-48"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="gw-rank" className="text-xs"># from end</Label>
            <Input
              id="gw-rank"
              type="number"
              min={1}
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="1"
              className="w-24"
            />
          </div>
          <Button size="sm" onClick={add} disabled={pending}>
            <PlusIcon /> Add
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No steps yet"
            description="Add the workflow steps — start with the last one (#1) and work backward."
          />
        ) : (
          <ol className="grid gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                {editingId === item.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 w-48"
                      autoFocus
                      aria-label={`Edit ${item.name}`}
                    />
                    <Input
                      type="number"
                      min={1}
                      value={editRank}
                      onChange={(e) => setEditRank(e.target.value)}
                      className="h-8 w-20"
                      aria-label={`Position of ${item.name}`}
                    />
                    <span className="ml-auto flex gap-1">
                      <Button size="xs" onClick={saveEdit} disabled={pending}>
                        <CheckIcon /> Save
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setEditingId(null)} disabled={pending}>
                        <XIcon /> Cancel
                      </Button>
                    </span>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="tabular-nums">#{item.rankFromEnd}</Badge>
                    <span className="wrap-break-word font-medium">{item.name}</span>
                    <span className="ml-auto flex gap-1">
                      <Button variant="ghost" size="xs" onClick={() => startEdit(item)} disabled={pending}>
                        <PencilIcon /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(item)}
                        disabled={pending}
                      >
                        <Trash2Icon /> Delete
                      </Button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-muted-foreground">
          Order shown top → bottom is the production sequence; the bottom step
          (#1) is the last one before the job is done.
        </p>
      </CardContent>
    </Card>
  );
}
