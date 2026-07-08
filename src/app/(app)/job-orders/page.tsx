import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { JobOrdersView } from "@/modules/job-orders/components/job-orders-view";

export const metadata: Metadata = { title: "Job Orders" };

export default async function JobOrdersPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canWrite =
    role === "ADMIN" || role === "MANAGER" || role === "ENCODER";
  const canImport = role === "ADMIN" || role === "MANAGER";

  return (
    <>
      <PageHeader
        title="Job Orders"
        description="Track every JO and its line items through production — migrated from JOWebApp."
      />
      <JobOrdersView canWrite={canWrite} canImport={canImport} />
    </>
  );
}
