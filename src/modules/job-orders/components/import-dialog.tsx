"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImportLegacyCsv } from "../hooks/use-job-orders";
import type { ImportSummaryDto } from "../schemas/job-order";

type Source = "lineup" | "archive";

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>("lineup");
  const [summary, setSummary] = useState<ImportSummaryDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importCsv = useImportLegacyCsv();

  const submit = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a .csv or .xlsx file first.");
      return;
    }
    importCsv.mutate(
      { file, source },
      {
        onSuccess: (result) => {
          setSummary(result);
          toast.success(
            `Imported ${result.jobOrdersCreated} JOs (${result.itemsCreated} items).`
          );
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSummary(null);
      importCsv.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UploadIcon /> Import legacy data
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from JOWebApp</DialogTitle>
          <DialogDescription>
            In Google Sheets open the JO Database and download it as .xlsx
            (File → Download → Microsoft Excel) — the right tab is picked
            automatically — or download a single tab as .csv. Re-imports are
            safe: existing JO numbers are skipped.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <ImportSummary summary={summary} />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="import-source">Which sheet is this?</Label>
              <Select
                value={source}
                onValueChange={(value) => setSource(value as Source)}
              >
                <SelectTrigger id="import-source" className="w-full">
                  <SelectValue placeholder="Pick the sheet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lineup">
                    Line-up JOs (active board)
                  </SelectItem>
                  <SelectItem value="archive">
                    Archive Line-up JOs (completed history)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-file">File (.csv or .xlsx)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ref={fileRef}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {summary ? (
            <Button onClick={() => reset(false)}>Done</Button>
          ) : (
            <Button onClick={submit} disabled={importCsv.isPending}>
              {importCsv.isPending ? "Importing…" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportSummary({ summary }: { summary: ImportSummaryDto }) {
  return (
    <div className="grid gap-2 text-sm">
      <p>
        Created <strong>{summary.jobOrdersCreated}</strong> job orders /{" "}
        <strong>{summary.itemsCreated}</strong> items, plus{" "}
        <strong>{summary.customersCreated}</strong> new customers.
      </p>
      {summary.skippedExisting.length > 0 && (
        <p className="text-muted-foreground">
          Skipped {summary.skippedExisting.length} already-imported JO
          number(s): {summary.skippedExisting.slice(0, 8).join(", ")}
          {summary.skippedExisting.length > 8 ? "…" : ""}
        </p>
      )}
      {summary.errors.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-destructive/30 p-2">
          <p className="mb-1 font-medium text-destructive">
            {summary.errors.length} row(s) failed:
          </p>
          <ul className="grid gap-1 text-xs text-muted-foreground">
            {summary.errors.map((err, i) => (
              <li key={i}>
                Line {err.line}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
