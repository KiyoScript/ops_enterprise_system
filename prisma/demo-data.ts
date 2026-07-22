// ============================================================
// Shared definitions for the dev seed set — imported by BOTH prisma/seed-demo.ts
// (creates them) and prisma/unseed-demo.ts (removes them). Pure data, no side
// effects. Everything here uses REAL document-number formats so the rows are
// indistinguishable from live data in the UI:
//   • JO numbers   R-AD{yyyy-MM-dd}-{seq}   (back-dated so they never collide
//                                            with today's auto-generated JOs)
//   • Quote numbers {QT|PO|NJ}-ORM-{yymm}-{seq5}  (seq chosen above the live
//                     counter; seed-demo bumps the counter so the app skips them)
// Identity for cleanup is carried by the numbers/names themselves (below) — no
// visible "DEMO" marker anywhere on the rows.
// ============================================================

import {
  CustomerType,
  JobOrderStatus,
  QuotationStatus,
  QuotationType,
  TaxType,
} from "../src/generated/prisma/enums";

// yymm segment used in the seed quote numbers (matches "2607" = Jul 2026).
export const QUOTE_YYMM = "2607";

export interface DemoCustomer {
  name: string;
  company?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  tin?: string;
  customerType: CustomerType;
  vatRegistered: boolean;
}

export const demoCustomers: DemoCustomer[] = [
  {
    name: "Northgate Marketing Services",
    company: "Northgate Marketing Services",
    contactNumber: "0917 812 3345",
    email: "northgate.mktg@gmail.com",
    address: "Brgy. Cogon, Ormoc City, Leyte",
    tin: "245-118-902-000",
    customerType: CustomerType.TYPE_A,
    vatRegistered: true,
  },
  {
    name: "St. Peter's College of Ormoc",
    company: "St. Peter's College of Ormoc, Inc.",
    contactNumber: "0928 445 1120",
    email: "registrar@speters.edu.ph",
    address: "Larrazabal Ave., Ormoc City, Leyte",
    customerType: CustomerType.TYPE_B,
    vatRegistered: false,
  },
  {
    name: "Sunrise Hardware & Construction Supply",
    company: "Sunrise Hardware & Construction Supply",
    contactNumber: "0917 233 9087",
    email: "sunrise.hardware.ph@gmail.com",
    address: "Bonifacio St., Ormoc City, Leyte",
    tin: "310-556-774-000",
    customerType: CustomerType.TYPE_B,
    vatRegistered: true,
  },
  {
    name: "Leyte Progressive Cooperative",
    company: "Leyte Progressive Cooperative",
    contactNumber: "0906 771 5540",
    email: "leyteprogressive.coop@gmail.com",
    address: "Real St., Ormoc City, Leyte",
    customerType: CustomerType.TYPE_C,
    vatRegistered: false,
  },
  {
    name: "Maria Fe Villanueva",
    contactNumber: "0995 118 2276",
    email: "mariafe.villanueva@gmail.com",
    address: "Brgy. Linao, Ormoc City, Leyte",
    customerType: CustomerType.TYPE_C,
    vatRegistered: false,
  },
];

export interface QuoteLine {
  product?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount?: number;
}
export interface DemoQuote {
  number: string;
  type: QuotationType;
  status: QuotationStatus;
  taxType: TaxType;
  customer: number; // index into demoCustomers
  poNumber?: string;
  discount?: number;
  paymentTermLabel?: string;
  downpaymentRate?: number;
  notes?: string;
  validUntilDays?: number;
  items: QuoteLine[];
}

export const demoQuotes: DemoQuote[] = [
  {
    number: `QT-ORM-${QUOTE_YYMM}-00002`,
    type: QuotationType.SALES,
    status: QuotationStatus.DRAFT,
    taxType: TaxType.NON_VAT,
    customer: 0,
    validUntilDays: 30,
    items: [
      { product: "Tarpaulin", description: "Tarpaulin 4×8 ft — full color, with eyelets", qty: 32, unitPrice: 50 },
    ],
  },
  {
    number: `QT-ORM-${QUOTE_YYMM}-00003`,
    type: QuotationType.SALES,
    status: QuotationStatus.SENT,
    taxType: TaxType.VAT_EXCLUSIVE,
    customer: 1,
    paymentTermLabel: "50% downpayment",
    downpaymentRate: 0.5,
    validUntilDays: 30,
    items: [
      { product: "Calling Card", description: "Calling cards — back-to-back, mirrorkote", qty: 10, unitPrice: 500 },
      { product: "Certificate", description: "Award certificates — mirrorkote", qty: 100, unitPrice: 30 },
    ],
  },
  {
    number: `PO-ORM-${QUOTE_YYMM}-00001`,
    type: QuotationType.PO,
    status: QuotationStatus.APPROVED,
    taxType: TaxType.VAT_EXCLUSIVE,
    customer: 2,
    poNumber: "PO-2025-1187",
    validUntilDays: 45,
    items: [
      { product: "ID Printing", description: "PVC company IDs with lanyard", qty: 80, unitPrice: 175 },
    ],
  },
  {
    number: `NJ-ORM-${QUOTE_YYMM}-00001`,
    type: QuotationType.NON_JO,
    status: QuotationStatus.DRAFT,
    taxType: TaxType.NON_VAT,
    customer: 3,
    items: [
      { description: "Photocopy — A4, black & white", qty: 1000, unitPrice: 2 },
    ],
  },
  {
    number: `QT-ORM-${QUOTE_YYMM}-00004`,
    type: QuotationType.SALES,
    status: QuotationStatus.APPROVED,
    taxType: TaxType.NON_VAT,
    customer: 4,
    discount: 100,
    validUntilDays: 30,
    items: [
      { product: "Mug", description: "White mug — full wrap print", qty: 25, unitPrice: 125 },
      { product: "Canvas Print", description: "Canvas print 16×20 in", qty: 2, unitPrice: 450 },
    ],
  },
];

export interface JoLine {
  product?: string;
  description: string;
  qty: number;
  unitPrice: number;
  productionStatus?: string;
  department?: string;
  category?: string;
  assignedTo?: string;
  deadlineDays?: number;
  actualDateDays?: number;
  archivedDays?: number;
  isRush?: boolean;
  isLFP?: boolean;
  lfpWidth?: string;
  lfpHeight?: string;
  lfpUnit?: string;
}
export interface DemoJo {
  number: string;
  customer: number;
  status: JobOrderStatus;
  isLFP?: boolean;
  deadlineDays?: number;
  notes?: string;
  items: JoLine[];
}

export const demoJos: DemoJo[] = [
  {
    number: "R-AD2026-07-18-03",
    customer: 0,
    status: JobOrderStatus.IN_PROGRESS,
    isLFP: true,
    deadlineDays: 2,
    notes: "Grand opening tarp — priority.",
    items: [
      {
        product: "Tarpaulin",
        description: "Tarpaulin 4×8 ft — grand opening banner",
        qty: 32,
        unitPrice: 50,
        productionStatus: "Ongoing - Printing",
        department: "Printing",
        category: "Large Format",
        assignedTo: "Rolando Diaz",
        deadlineDays: 2,
        isLFP: true,
        lfpWidth: "4",
        lfpHeight: "8",
        lfpUnit: "ft",
      },
    ],
  },
  {
    number: "R-AD2026-07-19-01",
    customer: 1,
    status: JobOrderStatus.COMPLETED,
    deadlineDays: -3,
    notes: "Completed; ready for sales invoice.",
    items: [
      {
        product: "Calling Card",
        description: "Calling cards — back-to-back, mirrorkote",
        qty: 10,
        unitPrice: 500,
        productionStatus: "Done - Completed",
        department: "Completed",
        category: "Printing",
        assignedTo: "Grace Lim",
        deadlineDays: -3,
        actualDateDays: -2,
        archivedDays: -2,
      },
    ],
  },
  {
    number: "R-AD2026-07-20-01",
    customer: 2,
    status: JobOrderStatus.APPROVED,
    deadlineDays: 6,
    items: [
      {
        product: "ID Printing",
        description: "PVC company IDs with lanyard",
        qty: 80,
        unitPrice: 175,
        productionStatus: "For Layout - Graphics",
        department: "Graphics",
        category: "Printing",
        assignedTo: "Rolando Diaz",
        deadlineDays: 6,
      },
      {
        product: "Sticker",
        description: "ID holder stickers",
        qty: 80,
        unitPrice: 15,
        productionStatus: "For Layout - Graphics",
        department: "Graphics",
        category: "Printing",
        deadlineDays: 6,
      },
    ],
  },
  {
    number: "R-AD2026-07-21-01",
    customer: 3,
    status: JobOrderStatus.DRAFT,
    deadlineDays: 9,
    items: [
      {
        product: "Mug",
        description: "White mug — full wrap print (25 pcs)",
        qty: 25,
        unitPrice: 125,
        productionStatus: "For Layout - Graphics",
        department: "Graphics",
        category: "Souvenirs",
        deadlineDays: 9,
      },
    ],
  },
  {
    number: "R-AD2026-07-21-02",
    customer: 4,
    status: JobOrderStatus.IN_PROGRESS,
    deadlineDays: 1,
    notes: "Rush — client will pick up.",
    items: [
      {
        product: "Canvas Print",
        description: "Canvas print 16×20 in",
        qty: 2,
        unitPrice: 450,
        productionStatus: "Waiting - For Pick up / Delivery",
        department: "Production",
        category: "Large Format",
        assignedTo: "Grace Lim",
        deadlineDays: 1,
        isRush: true,
      },
      {
        product: "Frame",
        description: "Wooden frame with matting",
        qty: 2,
        unitPrice: 600,
        productionStatus: "Ongoing - Production",
        department: "Production",
        category: "Frames",
        assignedTo: "Grace Lim",
        deadlineDays: 1,
        isRush: true,
      },
    ],
  },
];

// Identity lists used by unseed-demo.ts (invisible to end users).
export const demoCustomerNames = demoCustomers.map((c) => c.name);
export const demoQuoteNumbers = demoQuotes.map((q) => q.number);
export const demoJoNumbers = demoJos.map((j) => j.number);
