import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { JobOrderForm } from "@/modules/job-orders/components/job-order-form";

export const metadata: Metadata = { title: "New Job Order" };

export default async function NewJobOrderPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "ENCODER") {
    redirect("/job-orders");
  }

  return (
    <>
      <PageHeader
        title="New Job Order"
        description="Enter the JO number from the physical slip, then add its line items."
      />
      <JobOrderForm mode="create" />
    </>
  );
}
