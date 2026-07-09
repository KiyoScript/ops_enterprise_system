import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok } from "@/lib/errors";
import { getJobOrderService } from "@/modules/job-orders/services";

// GET /api/job-orders/metrics — board metric card counts (legacy JO_METRICS).
export async function GET() {
  try {
    await requireActor();
    const metrics = await getJobOrderService().getBoardMetrics();
    return NextResponse.json(ok(metrics));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
