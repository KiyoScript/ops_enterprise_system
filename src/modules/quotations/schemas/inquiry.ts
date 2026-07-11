import { z } from "zod";

// Inquiry log (spec 1.2 step 1) — the pre-quote entry point. No customer
// record yet: the Customer master row is created when the quote is made,
// so casual inquiries never pollute the master.

export const INQUIRY_MEDIUMS = [
  "MESSENGER",
  "EMAIL",
  "WALK_IN",
  "CALL",
] as const;

const inquiryFields = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer Name is required.")
    .max(200),
  contactNumber: z.string().trim().max(40).optional(),
  medium: z.enum(INQUIRY_MEDIUMS),
  servicesRequested: z
    .string()
    .trim()
    .min(1, "What is the customer asking for?")
    .max(500),
  notes: z.string().trim().max(2000).optional(),
});

export const inquiryCreateInput = inquiryFields;

export const inquiryUpdateInput = inquiryFields.extend({
  id: z.string().min(1),
});

export const inquiryListFilters = z.object({
  q: z.string().trim().max(200).optional(),
  view: z.enum(["open", "quoted", "all"]).default("open"),
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
});

export type InquiryCreateInput = z.infer<typeof inquiryCreateInput>;
export type InquiryUpdateInput = z.infer<typeof inquiryUpdateInput>;
export type InquiryListFilters = z.infer<typeof inquiryListFilters>;

// ——— DTOs ———

export type InquiryRowDto = {
  id: string;
  customerName: string;
  contactNumber: string | null;
  medium: string;
  servicesRequested: string;
  notes: string | null;
  quotationId: string | null;
  quoteNumber: string | null;
  quoteStatus: string | null;
  createdAt: string;
  createdByName: string;
};

export type InquiryPageDto = {
  rows: InquiryRowDto[];
  nextCursor: string | null;
};
