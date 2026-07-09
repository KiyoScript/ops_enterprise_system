import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { JoCalendar } from "@/modules/job-orders/components/jo-calendar";

export const metadata: Metadata = { title: "JO Calendar" };

export default async function JoCalendarPage() {
  const session = await auth();
  const role = session?.user?.role;
  // Legacy rule: Admin + Production Planner may drag deadlines.
  const canMove = role === "ADMIN" || role === "MANAGER";

  return (
    <>
      <PageHeader
        title="JO Calendar"
        description="Deadlines of active items by day — waiting-pickup and archived items drop off, like the legacy calendar."
      />
      <JoCalendar canMove={canMove} />
    </>
  );
}
