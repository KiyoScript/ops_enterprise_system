import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { requireActor } from "@/lib/authz";
import { getJobOrderService } from "@/modules/job-orders/services";
import { PageHeader } from "@/components/page-header";
import { BackButton } from "@/components/back-button";
import { JobOrderForm } from "@/modules/job-orders/components/job-order-form";
import { DeleteJobOrderButton } from "@/modules/job-orders/components/delete-job-order-button";
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

  const canDelete = actor.role === "ADMIN" || actor.role === "MANAGER";

  return (
    <>
      <BackButton fallbackHref="/job-orders" label="Job Orders" />
      <PageHeader
        title={`Edit ${jo.joNumber}`}
        description="Whole-JO edit: add or remove items, notes, plan dates. Day-to-day status updates happen in the board's Edit modal."
      >
        {canDelete && <DeleteJobOrderButton id={jo.id} joNumber={jo.joNumber} />}
      </PageHeader>
      <JobOrderForm mode="edit" jobOrderId={jo.id} initialValues={initialValues} />
    </>
  );
}
