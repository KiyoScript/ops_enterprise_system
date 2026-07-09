import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok, ValidationError } from "@/lib/errors";
import { fileToRows } from "@/lib/spreadsheet";
import { getLegacyImportService } from "@/modules/job-orders/services";
import { importRequestInput } from "@/modules/job-orders/schemas/job-order";

const MAX_BYTES = 20 * 1024 * 1024;

// The tab to read when a whole .xlsx workbook is uploaded.
const SHEET_BY_SOURCE = {
  lineup: ["Line-up JOs"],
  archive: ["Archive Line-up JOs"],
} as const;

// POST /api/job-orders/import — multipart upload of a legacy sheet
// (.csv or .xlsx). A Route Handler (not a Server Action) because it
// carries a file.
export async function POST(request: Request) {
  try {
    const actor = await requireActor();

    const form = await request.formData();
    const file = form.get("file");
    const parsed = importRequestInput.safeParse({ source: form.get("source") });
    if (!parsed.success) throw new ValidationError("Pick a valid import source.");
    if (!(file instanceof File)) {
      throw new ValidationError("Attach a .csv or .xlsx file.");
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError("File is too large (max 20 MB).");
    }

    const rows = await fileToRows(file, [
      ...SHEET_BY_SOURCE[parsed.data.source],
    ]);
    const summary = await getLegacyImportService().import(
      actor,
      rows,
      parsed.data.source
    );
    return NextResponse.json(ok(summary));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
