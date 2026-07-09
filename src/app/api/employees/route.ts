import { NextResponse } from "next/server";
import { requireActor } from "@/lib/authz";
import { AppError, fail, ok } from "@/lib/errors";
import { getEmployeeService } from "@/modules/shared/services/employee-service";

// GET /api/employees — active employees for the assigned-to picker.
export async function GET() {
  try {
    const actor = await requireActor();
    const employees = await getEmployeeService().list(actor);
    return NextResponse.json(ok(employees));
  } catch (err) {
    return NextResponse.json(fail(err), {
      status: err instanceof AppError ? err.status : 500,
    });
  }
}
