import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok } from "@/lib/errors";
import { getDeliveryReceiptService } from "@/modules/delivery-receipts/services";

// GET /api/delivery-receipts/metrics — quick-decision cards.
export async function GET() {
  try {
    await requireActor();
    const metrics = await getDeliveryReceiptService().getMetrics();
    return NextResponse.json(ok(metrics));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
