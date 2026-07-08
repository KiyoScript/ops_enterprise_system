import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { requireActor } from "@/lib/authz";
import { getJobOrderService } from "@/modules/job-orders/services";
import { PageHeader } from "@/components/page-header";
import { JobOrderForm } from "@/modules/job-orders/components/job-order-form";
import type { JobOrderCreateInput } from "@/modules/job-orders/schemas/job-order";

export const metadata: Metadata = { title: "Edit Job Order" };

export default async function EditJobOrderPage({
  params,
}: {
  params: Promise<{ joId: string }>;
}) {
  const { joId } = await params;
  const actor = await requireActor();
  if (
    actor.role !== "ADMIN" &&
    actor.role !== "MANAGER" &&
    actor.role !== "ENCODER"
  ) {
    redirect(`/job-orders/${joId}`);
  }

  let jo;
  try {
    jo = await getJobOrderService().get(actor, joId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const initialValues: JobOrderCreateInput = {
    joNumber: jo.joNumber,
    customerName: jo.customer.name,
    notes: jo.notes ?? "",
    planDateStart: jo.planDateStart?.slice(0, 10) ?? "",
    planDateEnd: jo.planDateEnd?.slice(0, 10) ?? "",
    items: jo.items.map((item) => ({
      id: item.id,
      description: item.description,
      qty: String(item.qty),
      amount: item.lineTotal,
      deadline: item.deadline?.slice(0, 10) ?? "",
      productionStatus: item.productionStatus ?? "",
      assignedTo: item.assignedTo ?? "",
      category: item.category ?? "",
      isLFP: item.isLFP,
      lfpWidth: item.lfpWidth ?? "",
      lfpHeight: item.lfpHeight ?? "",
      lfpUnit: item.lfpUnit ?? "ft",
      isRush: item.isRush,
    })),
  };

  return (
    <>
      <PageHeader
        title={`Edit ${jo.joNumber}`}
        description="Item production statuses are updated from the detail page, not here."
      />
      <JobOrderForm mode="edit" jobOrderId={jo.id} initialValues={initialValues} />
    </>
  );
}
