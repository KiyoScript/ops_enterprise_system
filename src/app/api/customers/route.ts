import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok } from "@/lib/errors";
import { getCustomerService } from "@/modules/shared/services/customer-service";

// GET /api/customers?q= — name search for the customer picker.
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const options = await getCustomerService().search(actor, q);
    return NextResponse.json(ok(options));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
