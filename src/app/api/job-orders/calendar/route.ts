import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok, ValidationError } from "@/lib/errors";
import { getJobOrderService } from "@/modules/job-orders/services";
import { calendarMonthInput } from "@/modules/job-orders/schemas/job-order";

// GET /api/job-orders/calendar?year=&month= — deadline pins for one month.
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = calendarMonthInput.safeParse(params);
    if (!parsed.success) throw new ValidationError("Invalid month.");
    const rows = await getJobOrderService().listCalendar(
      actor,
      parsed.data.year,
      parsed.data.month
    );
    return NextResponse.json(ok(rows));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
