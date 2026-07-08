import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok, ValidationError } from "@/lib/errors";
import { getLookupService } from "@/modules/shared/services/lookup-service";
import { lookupTypeInput } from "@/modules/shared/schemas/lookup";

// GET /api/lookups?type=JO_STATUS — active options for pickers.
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const parsed = lookupTypeInput.safeParse(
      new URL(request.url).searchParams.get("type")
    );
    if (!parsed.success) throw new ValidationError("Unknown lookup type.");
    const options = await getLookupService().list(actor, parsed.data);
    return NextResponse.json(ok(options));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
