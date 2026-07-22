import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  CustomerType,
  JobOrderStatus,
  QuotationStatus,
  QuotationType,
  TaxType,
} from "../src/generated/prisma/enums";

// ============================================================
// DEMO / DEV SEED — 5 customers + 5 quotations + 5 job orders.
// Non-destructive & idempotent: every row is create-if-missing (keyed by a
// unique DEMO- number / name), so re-running never duplicates and never
// clobbers real data. Everything it writes carries DEMO_NOTE, so cleanup is a
// one-liner:  DELETE ... WHERE notes = 'SEED_DEMO ...'  (children cascade).
// Run:  npx tsx prisma/seed-demo.ts   (or:  npm run db:seed-demo)
// ============================================================

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_NOTE = "SEED_DEMO — safe to delete";
const round2 = (n: number) => Math.round(n * 100) / 100;
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

// ─── demo customers ─────────────────────────────────────────
const demoCustomers = [
  {
    name: "Alpha Signs & Prints (Demo)",
    company: "Alpha Signs & Prints",
    contactNumber: "0917-100-0001",
    email: "alpha@demo.local",
    address: "Bonifacio St., Ormoc City",
    tin: "001-234-567-000",
    customerType: CustomerType.TYPE_A,
    vatRegistered: true,
  },
  {
    name: "Bright Media Ormoc (Demo)",
    company: "Bright Media",
    contactNumber: "0917-100-0002",
    email: "bright@demo.local",
    address: "Aviles St., Ormoc City",
    customerType: CustomerType.TYPE_B,
    vatRegistered: false,
  },
  {
    name: "Cordova Enterprises (Demo)",
    company: "Cordova Enterprises",
    contactNumber: "0917-100-0003",
    email: "cordova@demo.local",
    address: "Real St., Ormoc City",
    tin: "223-445-667-000",
    customerType: CustomerType.TYPE_B,
    vatRegistered: true,
  },
  {
    name: "Delgado School Supplies (Demo)",
    company: "Delgado School Supplies",
    contactNumber: "0917-100-0004",
    email: "delgado@demo.local",
    address: "Lopez Jaena St., Ormoc City",
    customerType: CustomerType.TYPE_C,
    vatRegistered: false,
  },
  {
    name: "Walk-in Customer (Demo)",
    contactNumber: "0917-100-0005",
    address: "Ormoc City",
    customerType: CustomerType.TYPE_C,
    vatRegistered: false,
  },
];

// ─── demo quotations ────────────────────────────────────────
interface QuoteLine {
  product?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount?: number;
}
interface DemoQuote {
  number: string;
  type: QuotationType;
  status: QuotationStatus;
  taxType: TaxType;
  customer: number; // index into demoCustomers
  poNumber?: string;
  discount?: number;
  items: QuoteLine[];
}

const demoQuotes: DemoQuote[] = [
  {
    number: "Q-DEMO-2607-01",
    type: QuotationType.SALES,
    status: QuotationStatus.DRAFT,
    taxType: TaxType.NON_VAT,
    customer: 0,
    items: [
      { product: "Tarpaulin", description: "Tarpaulin 3×5 ft — full color, eyelets", qty: 15, unitPrice: 50 },
      { description: "Rush fee", qty: 1, unitPrice: 150 },
    ],
  },
  {
    number: "Q-DEMO-2607-02",
    type: QuotationType.SALES,
    status: QuotationStatus.SENT,
    taxType: TaxType.VAT_EXCLUSIVE,
    customer: 1,
    items: [
      { product: "Calling Card", description: "Calling cards — back-to-back, mirrorkote", qty: 5, unitPrice: 500 },
      { product: "Sticker", description: "Vinyl stickers — pre-cut logo", qty: 10, unitPrice: 150 },
    ],
  },
  {
    number: "Q-DEMO-2607-03",
    type: QuotationType.PO,
    status: QuotationStatus.APPROVED,
    taxType: TaxType.VAT_EXCLUSIVE,
    customer: 2,
    poNumber: "PO-DEMO-8842",
    items: [
      { product: "ID Printing", description: "PVC company IDs with lanyard", qty: 50, unitPrice: 175 },
    ],
  },
  {
    number: "Q-DEMO-2607-04",
    type: QuotationType.NON_JO,
    status: QuotationStatus.DRAFT,
    taxType: TaxType.NON_VAT,
    customer: 3,
    items: [
      { description: "Photocopy — A4, 1 ream (walk-in, non-JO)", qty: 500, unitPrice: 2 },
    ],
  },
  {
    number: "Q-DEMO-2607-05",
    type: QuotationType.SALES,
    status: QuotationStatus.APPROVED,
    taxType: TaxType.NON_VAT,
    customer: 4,
    discount: 100,
    items: [
      { product: "Mug", description: "White mug — full wrap print", qty: 25, unitPrice: 125 },
      { product: "Canvas Print", description: "Canvas print 16×20 in", qty: 2, unitPrice: 450 },
    ],
  },
];

// ─── demo job orders ────────────────────────────────────────
interface JoLine {
  product?: string;
  description: string;
  qty: number;
  unitPrice: number;
  productionStatus?: string;
  department?: string;
  category?: string;
  assignedTo?: string;
  deadline?: Date;
  isRush?: boolean;
  isLFP?: boolean;
  lfpWidth?: string;
  lfpHeight?: string;
  lfpUnit?: string;
  archivedAt?: Date;
  actualDate?: Date;
}
interface DemoJo {
  number: string;
  customer: number;
  status: JobOrderStatus;
  isLFP?: boolean;
  deadline?: Date;
  items: JoLine[];
}

const demoJos: DemoJo[] = [
  {
    number: "DEMO-JO-2607-01",
    customer: 0,
    status: JobOrderStatus.IN_PROGRESS,
    isLFP: true,
    deadline: days(3),
    items: [
      {
        product: "Tarpaulin",
        description: "Tarpaulin 4×8 ft — grand opening banner",
        qty: 32,
        unitPrice: 50,
        productionStatus: "Ongoing - Printing",
        department: "Printing",
        category: "Large Format",
        assignedTo: "Juan Dela Cruz",
        deadline: days(3),
        isLFP: true,
        lfpWidth: "4",
        lfpHeight: "8",
        lfpUnit: "ft",
      },
    ],
  },
  {
    number: "DEMO-JO-2607-02",
    customer: 1,
    status: JobOrderStatus.COMPLETED,
    deadline: days(-2),
    items: [
      {
        product: "Calling Card",
        description: "Calling cards — back-to-back, mirrorkote",
        qty: 5,
        unitPrice: 500,
        productionStatus: "Done - Completed",
        department: "Completed",
        category: "Printing",
        assignedTo: "Maria Santos",
        deadline: days(-2),
        actualDate: days(-1),
        archivedAt: days(-1),
      },
    ],
  },
  {
    number: "DEMO-JO-2607-03",
    customer: 2,
    status: JobOrderStatus.APPROVED,
    deadline: days(7),
    items: [
      {
        product: "ID Printing",
        description: "PVC company IDs with lanyard",
        qty: 50,
        unitPrice: 175,
        productionStatus: "For Layout - Graphics",
        department: "Graphics",
        category: "Printing",
        assignedTo: "Pedro Reyes",
        deadline: days(7),
      },
      {
        product: "Sticker",
        description: "ID holder stickers",
        qty: 50,
        unitPrice: 15,
        productionStatus: "For Layout - Graphics",
        department: "Graphics",
        category: "Printing",
        deadline: days(7),
      },
    ],
  },
  {
    number: "DEMO-JO-2607-04",
    customer: 3,
    status: JobOrderStatus.DRAFT,
    deadline: days(10),
    items: [
      {
        product: "Mug",
        description: "White mug — full wrap print (25 pcs)",
        qty: 25,
        unitPrice: 125,
        productionStatus: "For Layout - Graphics",
        department: "Graphics",
        category: "Souvenirs",
        deadline: days(10),
      },
    ],
  },
  {
    number: "DEMO-JO-2607-05",
    customer: 4,
    status: JobOrderStatus.IN_PROGRESS,
    deadline: days(1),
    items: [
      {
        product: "Canvas Print",
        description: "Canvas print 16×20 in — RUSH",
        qty: 2,
        unitPrice: 450,
        productionStatus: "Waiting - For Pick up / Delivery",
        department: "Production",
        category: "Large Format",
        assignedTo: "Ana Cruz",
        deadline: days(1),
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
        assignedTo: "Ana Cruz",
        deadline: days(1),
        isRush: true,
      },
    ],
  },
];

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@ops.local" },
  });

  // Product-name → id map (products are seeded by prisma/seed.ts).
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const productByName = new Map(products.map((p) => [p.name.toLowerCase(), p.id] as const));
  const pid = (name?: string) => (name ? productByName.get(name.toLowerCase()) ?? null : null);

  // 1) Customers ----------------------------------------------------------
  const customerIds: string[] = [];
  let newCustomers = 0;
  for (const c of demoCustomers) {
    let row = await prisma.customer.findFirst({ where: { name: c.name }, select: { id: true } });
    if (!row) {
      row = await prisma.customer.create({
        data: { ...c, notes: DEMO_NOTE, createdById: admin.id },
        select: { id: true },
      });
      newCustomers++;
    }
    customerIds.push(row.id);
  }
  console.log(`Customers: +${newCustomers} new (${demoCustomers.length - newCustomers} already existed).`);

  // 2) Quotations ---------------------------------------------------------
  let newQuotes = 0;
  for (const q of demoQuotes) {
    if (await prisma.quotation.findUnique({ where: { quoteNumber: q.number }, select: { id: true } })) {
      continue;
    }
    const lines = q.items.map((it, i) => ({
      productId: pid(it.product),
      description: it.description,
      qty: it.qty,
      unitPrice: it.unitPrice,
      discount: it.discount ?? 0,
      lineTotal: round2(it.qty * it.unitPrice - (it.discount ?? 0)),
      sortOrder: i,
    }));
    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const discount = q.discount ?? 0;
    const taxable = round2(subtotal - discount);
    const taxAmount = q.taxType === TaxType.VAT_EXCLUSIVE ? round2(taxable * 0.12) : 0;
    const total =
      q.taxType === TaxType.VAT_INCLUSIVE ? taxable : round2(taxable + taxAmount);
    const decided = q.status === QuotationStatus.APPROVED;
    const sent =
      q.status === QuotationStatus.SENT || q.status === QuotationStatus.APPROVED;

    await prisma.quotation.create({
      data: {
        quoteNumber: q.number,
        type: q.type,
        status: q.status,
        poNumber: q.poNumber ?? null,
        customerId: customerIds[q.customer]!,
        createdById: admin.id,
        validUntil: days(30),
        subtotal,
        discount,
        taxType: q.taxType,
        taxAmount,
        total,
        notes: DEMO_NOTE,
        sentAt: sent ? new Date() : null,
        approvedById: decided ? admin.id : null,
        approvedAt: decided ? new Date() : null,
        items: { create: lines },
      },
    });
    newQuotes++;
  }
  console.log(`Quotations: +${newQuotes} new (${demoQuotes.length - newQuotes} already existed).`);

  // 3) Job orders ---------------------------------------------------------
  let newJos = 0;
  for (const jo of demoJos) {
    if (await prisma.jobOrder.findUnique({ where: { joNumber: jo.number }, select: { id: true } })) {
      continue;
    }
    const lines = jo.items.map((it, i) => ({
      productId: pid(it.product),
      description: it.description,
      qty: it.qty,
      unitPrice: it.unitPrice,
      lineTotal: round2(it.qty * it.unitPrice),
      lineItemId: `${jo.number}-${String(i + 1).padStart(2, "0")}`,
      sortOrder: i,
      productionStatus: it.productionStatus ?? null,
      department: it.department ?? null,
      category: it.category ?? null,
      assignedTo: it.assignedTo ?? null,
      deadline: it.deadline ?? null,
      actualDate: it.actualDate ?? null,
      archivedAt: it.archivedAt ?? null,
      isRush: it.isRush ?? false,
      isLFP: it.isLFP ?? false,
      lfpWidth: it.lfpWidth ?? null,
      lfpHeight: it.lfpHeight ?? null,
      lfpUnit: it.lfpUnit ?? null,
    }));
    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const decided =
      jo.status !== JobOrderStatus.DRAFT && jo.status !== JobOrderStatus.PENDING_REVIEW;
    const inProduction =
      jo.status === JobOrderStatus.IN_PROGRESS || jo.status === JobOrderStatus.COMPLETED;

    await prisma.jobOrder.create({
      data: {
        joNumber: jo.number,
        customerId: customerIds[jo.customer]!,
        createdById: admin.id,
        status: jo.status,
        isLFP: jo.isLFP ?? false,
        deadline: jo.deadline ?? null,
        subtotal,
        total: subtotal,
        notes: DEMO_NOTE,
        isApprovedByCustomer: inProduction,
        customerApprovedAt: inProduction ? new Date() : null,
        approvedById: decided ? admin.id : null,
        approvedAt: decided ? new Date() : null,
        completedAt: jo.status === JobOrderStatus.COMPLETED ? new Date() : null,
        items: { create: lines },
      },
    });
    newJos++;
  }
  console.log(`Job orders: +${newJos} new (${demoJos.length - newJos} already existed).`);
  console.log("Demo seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
