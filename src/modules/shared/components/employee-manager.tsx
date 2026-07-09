"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ColorBadge } from "@/components/color-badge";
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
import { fetchJson } from "@/lib/api-client";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
} from "@/app/(app)/maintenance/job-orders/actions";
import type {
  EmployeeDto,
  EmployeeImportSummaryDto,
} from "../schemas/employee";

/** Employee master maintenance — mirrors the legacy EMPDATABASE sheet
 *  (Code / Team / Name / Email), importable straight from its CSV export. */
export function EmployeeManager({ items }: { items: EmployeeDto[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", team: "", email: "" });
  const [confirmDelete, setConfirmDelete] = useState<EmployeeDto | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    router.refresh();
  };

  const add = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Employee code and name are required.");
      return;
    }
    startTransition(async () => {
      const result = await createEmployeeAction({
        code: form.code.trim(),
        name: form.name.trim(),
        team: form.team.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${result.data.code} — ${result.data.name}.`);
      setForm({ code: "", name: "", team: "", email: "" });
      refresh();
    });
  };

  const toggleActive = (item: EmployeeDto) => {
    startTransition(async () => {
      const result = await updateEmployeeAction({
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

  const remove = (item: EmployeeDto) => {
    startTransition(async () => {
      const result = await deleteEmployeeAction({ id: item.id });
      setConfirmDelete(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${item.code}.`);
      refresh();
    });
  };

  const importCsv = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose the EMPDATABASE file first (.csv or .xlsx).");
      return;
    }
    setImporting(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const summary = await fetchJson<EmployeeImportSummaryDto>(
        "/api/employees/import",
        { method: "POST", body }
      );
      toast.success(
        `Imported ${summary.created} employee(s)` +
          (summary.skippedExisting.length
            ? `, skipped ${summary.skippedExisting.length} existing`
            : "") +
          (summary.errors.length ? `, ${summary.errors.length} error(s)` : "") +
          "."
      );
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Employees</CardTitle>
        <CardDescription>
          The employee master (legacy EMPDATABASE). JO items are assigned by
          employee code, so the code is what gets stored — the rest is for
          humans.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_1fr_1.5fr_auto]">
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Code (BATICA13)"
            aria-label="Employee code"
          />
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name (Batican, Pablo)"
            aria-label="Employee name"
          />
          <Input
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
            placeholder="Team"
            aria-label="Team"
          />
          <Input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email (optional)"
            aria-label="Email"
          />
          <Button onClick={add} disabled={pending}>
            <PlusIcon /> Add
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
          <UploadIcon className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Or import the EMPDATABASE sheet (.xlsx or .csv):
          </span>
          <Input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ref={fileRef}
            className="max-w-64"
            aria-label="EMPDATABASE file"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={importCsv}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import file"}
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Add them above or import the EMPDATABASE CSV."
          />
        ) : (
          <ul className="grid gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <span
                  className={`font-mono text-xs ${item.isActive ? "" : "text-muted-foreground line-through"}`}
                >
                  {item.code}
                </span>
                <span className={item.isActive ? "" : "text-muted-foreground line-through"}>
                  {item.name}
                </span>
                {item.team && <ColorBadge label={item.team} />}
                {item.email && (
                  <span className="text-xs text-muted-foreground">
                    {item.email}
                  </span>
                )}
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
                    aria-label={`Delete ${item.code}`}
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
            <DialogTitle>
              Delete {confirmDelete?.code} — {confirmDelete?.name}?
            </DialogTitle>
            <DialogDescription>
              Job orders keep the code they were assigned — this only removes
              the employee from the picker. Deactivate instead if they might
              come back.
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
