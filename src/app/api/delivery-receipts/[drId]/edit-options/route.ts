import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok } from "@/lib/errors";
import { getDeliveryReceiptService } from "@/modules/delivery-receipts/services";

// GET /api/delivery-receipts/:drId/edit-options — the JO's line items as
// selectable options for editing which ones this DR delivers.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ drId: string }> }
) {
  try {
    const actor = await requireActor();
    const { drId } = await params;
    const options = await getDeliveryReceiptService().getEditOptions(actor, drId);
    return NextResponse.json(ok(options));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
