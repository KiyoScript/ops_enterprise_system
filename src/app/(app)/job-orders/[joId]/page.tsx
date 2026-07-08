import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { requireActor } from "@/lib/authz";
import { getJobOrderService } from "@/modules/job-orders/services";
import { JobOrderDetail } from "@/modules/job-orders/components/job-order-detail";

export const metadata: Metadata = { title: "Job Order" };

export default async function JobOrderPage({
  params,
}: {
  params: Promise<{ joId: string }>;
}) {
  const { joId } = await params;
  const actor = await requireActor(); // (app) layout already guarantees a session

  let jo;
  try {
    jo = await getJobOrderService().get(actor, joId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const canWrite =
    actor.role === "ADMIN" ||
    actor.role === "MANAGER" ||
    actor.role === "ENCODER";
  const canDelete = actor.role === "ADMIN" || actor.role === "MANAGER";

  return <JobOrderDetail jo={jo} canWrite={canWrite} canDelete={canDelete} />;
}
