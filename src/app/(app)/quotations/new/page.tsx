import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/authz";
import { defineAbilityFor } from "@/lib/ability";
import { PageHeader } from "@/components/page-header";
import { BackButton } from "@/components/back-button";
import { QuotationForm } from "@/modules/quotations/components/quotation-form";

export const metadata: Metadata = { title: "New Quotation" };

export default async function NewQuotationPage() {
  const ability = defineAbilityFor(await requireActor());
  if (ability.cannot("create", "Quotation")) redirect("/quotations");

  return (
    <>
      <BackButton fallbackHref="/quotations" label="Quotations" />
      <PageHeader
        title="New Quotation"
        description="Drafts get an auto-generated number (Q-…) and stay editable until submitted for approval."
      />
      <QuotationForm mode="create" />
    </>
  );
}
