import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok, ValidationError } from "@/lib/errors";
import { getJobOrderService } from "@/modules/job-orders/services";

// GET /api/job-orders/items/:itemId/step-status — per-step status histories of
// this item's production steps, as { [stepId]: historyText | null }.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const actor = await requireActor();
    const { itemId } = await params;
    const histories = await getJobOrderService().getStepHistories(actor, itemId);
    return NextResponse.json(ok(histories));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}

// PATCH /api/job-orders/items/:itemId/step-status — post a status update onto
// one step (body { stepId, remark }).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const actor = await requireActor();
    await params; // itemId not needed — the step id identifies the row
    const body = (await request.json()) as { stepId?: string; remark?: string };
    if (!body.stepId || !body.remark?.trim()) {
      throw new ValidationError("stepId and a non-empty remark are required.");
    }
    await getJobOrderService().addStepStatus(actor, body.stepId, body.remark.trim());
    return NextResponse.json(ok(null));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
