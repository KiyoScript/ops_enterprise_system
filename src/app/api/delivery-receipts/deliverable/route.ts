import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok } from "@/lib/errors";
import { getDeliveryReceiptService } from "@/modules/delivery-receipts/services";

// GET /api/delivery-receipts/deliverable?jobOrderId= — completed JO items with
// quantity still to deliver (grouped by JO). Omit jobOrderId for all.
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const jobOrderId =
      new URL(request.url).searchParams.get("jobOrderId") ?? undefined;
    const groups = await getDeliveryReceiptService().listDeliverable(
      actor,
      jobOrderId
    );
    return NextResponse.json(ok(groups));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
