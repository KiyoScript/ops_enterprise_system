"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: "", name: "", team: "", email: "" });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const active = items.filter((i) => i.isActive);
  const archived = items.filter((i) => !i.isActive);

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

  const startEdit = (item: EmployeeDto) => {
    setEditingId(item.id);
    setEditForm({
      code: item.code,
      name: item.name,
      team: item.team ?? "",
      email: item.email ?? "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editForm.code.trim() || !editForm.name.trim()) {
      toast.error("Employee code and name are required.");
      return;
    }
    startTransition(async () => {
      const result = await updateEmployeeAction({
        id: editingId,
        code: editForm.code.trim(),
        name: editForm.name.trim(),
        team: editForm.team.trim(),
        email: editForm.email.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Saved ${editForm.code.trim()}.`);
      setEditingId(null);
      refresh();
    });
  };

  const removeItem = (item: EmployeeDto) => {
    if (
      !window.confirm(
        `Delete ${item.code} — ${item.name} permanently? JO assignments keep the code as text — only the master entry is removed.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteEmployeeAction({ id: item.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${item.code} deleted.`);
      refresh();
    });
  };

  const setArchivedState = (item: EmployeeDto, archive: boolean) => {
    startTransition(async () => {
      const result = await updateEmployeeAction({
        id: item.id,
        isActive: !archive,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(archive ? `${item.code} archived.` : `${item.code} restored.`);
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

        {active.length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Add them above or import the EMPDATABASE file."
          />
        ) : (
          <ul className="grid gap-1">
            {active.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                {editingId === item.id ? (
                  <>
                    <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_1.5fr_1fr_1.5fr]">
                      <Input
                        value={editForm.code}
                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                        className="h-8 font-mono text-xs"
                        aria-label="Edit employee code"
                        autoFocus
                      />
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="h-8"
                        aria-label="Edit employee name"
                      />
                      <Input
                        value={editForm.team}
                        onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                        placeholder="Team"
                        className="h-8"
                        aria-label="Edit team"
                      />
                      <Input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="Email"
                        className="h-8"
                        aria-label="Edit email"
                      />
                    </div>
                    <span className="flex gap-1">
                      <Button size="xs" onClick={saveEdit} disabled={pending}>
                        <CheckIcon /> Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingId(null)}
                        disabled={pending}
                      >
                        <XIcon /> Cancel
                      </Button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-xs">{item.code}</span>
                    <span className="wrap-break-word">{item.name}</span>
                    {item.team && <ColorBadge label={item.team} />}
                    {item.email && (
                      <span className="text-xs text-muted-foreground wrap-break-word">
                        {item.email}
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => startEdit(item)}
                        disabled={pending}
                      >
                        <PencilIcon /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setArchivedState(item, true)}
                        disabled={pending}
                      >
                        <ArchiveIcon /> Archive
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item)}
                        disabled={pending}
                      >
                        <Trash2Icon /> Delete
                      </Button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Archived ({archived.length})
            </summary>
            <ul className="mt-2 grid gap-1">
              {archived.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <span className="font-mono text-xs">{item.code}</span>
                  <span className="wrap-break-word">{item.name}</span>
                  {item.team && <Badge variant="ghost">{item.team}</Badge>}
                  <span className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setArchivedState(item, false)}
                      disabled={pending}
                    >
                      <ArchiveRestoreIcon /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(item)}
                      disabled={pending}
                    >
                      <Trash2Icon /> Delete
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
