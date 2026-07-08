import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Quotation Maintenance" };

export default function QuotationMaintenancePage() {
  return (
    <ModulePlaceholder
      title="Quotation Maintenance"
      description="Price database and product-type reference lists (from SignQuote)."
      phase="Phase 3"
    />
  );
}
