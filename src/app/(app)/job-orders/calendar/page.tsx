import type { Metadata } from "next";
import { requireActor } from "@/lib/authz";
import { defineAbilityFor } from "@/lib/ability";
import { PageHeader } from "@/components/page-header";
import { JoCalendar } from "@/modules/job-orders/components/jo-calendar";

export const metadata: Metadata = { title: "JO Calendar" };

export default async function JoCalendarPage() {
  const ability = defineAbilityFor(await requireActor());
  // Legacy rule: Admin + Production Planner may drag deadlines.
  const canMove = ability.can("move-deadline", "JobOrder");

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
