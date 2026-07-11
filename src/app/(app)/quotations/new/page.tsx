import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/authz";
import { defineAbilityFor } from "@/lib/ability";
import { NotFoundError } from "@/lib/errors";
import { PageHeader } from "@/components/page-header";
import { BackButton } from "@/components/back-button";
import { getInquiryService } from "@/modules/quotations/services";
import type {
  QuotationCreateInput,
} from "@/modules/quotations/schemas/quotation";
import type { InquiryRowDto } from "@/modules/quotations/schemas/inquiry";
import { QuotationForm } from "@/modules/quotations/components/quotation-form";

export const metadata: Metadata = { title: "New Quotation" };

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ inquiryId?: string }>;
}) {
  const actor = await requireActor();
  const ability = defineAbilityFor(actor);
  if (ability.cannot("create", "Quotation")) redirect("/quotations");

  // Drafting from an inquiry prefills customer + first item description.
  const { inquiryId } = await searchParams;
  let inquiry: InquiryRowDto | undefined;
  if (inquiryId) {
    try {
      inquiry = await getInquiryService().get(actor, inquiryId);
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
    }
    // Stale link: the inquiry was already quoted — go to that quote.
    if (inquiry?.quotationId) redirect(`/quotations/${inquiry.quotationId}`);
  }

  const initialValues: QuotationCreateInput | undefined = inquiry
    ? {
        customerName: inquiry.customerName,
        validUntil: "",
        taxType: "NON_VAT",
        paymentTermLabel: "50% Downpayment",
        downpaymentRate: "0.5",
        discount: "",
        notes: inquiry.notes ?? "",
        items: [
          {
            productId: "",
            description: inquiry.servicesRequested,
            qty: "1",
            unitPrice: "",
            discount: "",
          },
        ],
      }
    : undefined;

  return (
    <>
      <BackButton
        fallbackHref={inquiry ? "/inquiries" : "/quotations"}
        label={inquiry ? "Inquiries" : "Quotations"}
      />
      <PageHeader
        title="New Quotation"
        description={
          inquiry
            ? `Drafting from ${inquiry.customerName}'s inquiry — saving links the inquiry to this quote.`
            : "Drafts get an auto-generated number (Q-…) and stay editable until submitted for approval."
        }
      />
      <QuotationForm
        mode="create"
        initialValues={initialValues}
        inquiryId={inquiry?.id}
      />
    </>
  );
}
