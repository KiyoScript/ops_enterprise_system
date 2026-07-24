import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { demoCustomerNames, demoJoNumbers, demoQuoteNumbers } from "./demo-data";

// ============================================================
// UNDO the dev seed (prisma/seed-demo.ts). Deletes ONLY the exact rows the seed
// creates — the job orders / quotations with the seed's document numbers, and
// the customers with the seed's names — identified from the shared list in
// prisma/demo-data.ts (no visible marker lives on the rows themselves).
//
// A seed customer is skipped (not deleted) if anything got attached to it that
// the seed didn't create — a JO/quote/sale/DR you made by hand — so real work
// is never lost; those are reported instead. Counters bumped by seed-demo are
// left as-is (harmless).
// Run:  npx tsx prisma/unseed-demo.ts   (or:  npm run db:unseed-demo)
// ============================================================

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CUSTOMER_REFS = {
  jobOrders: true,
  quotations: true,
  sales: true,
  deliveryReceipts: true,
  collectionReceipts: true,
  advancePayments: true,
  inquiries: true,
} as const;

async function main() {
  const result = await prisma.$transaction(
    async (tx) => {
      // Clear records that reference the demo JOs and would otherwise block
      // their deletion (created by hand while testing: DR issuance, a sale).
      const demoJoFilter = { jobOrder: { joNumber: { in: demoJoNumbers } } };
      await tx.auditEntry.deleteMany({ where: { sale: demoJoFilter } });
      await tx.sale.deleteMany({ where: demoJoFilter });
      await tx.deliveryReceipt.deleteMany({ where: demoJoFilter });

      // Job orders + quotations first (cascade their items) so the seed
      // customers are left with nothing pointing at them.
      const jobOrders = await tx.jobOrder.deleteMany({
        where: { joNumber: { in: demoJoNumbers } },
      });
      const quotations = await tx.quotation.deleteMany({
        where: { quoteNumber: { in: demoQuoteNumbers } },
      });

      // Delete only the seed customers that are now clean (no leftover refs).
      const candidates = await tx.customer.findMany({
        where: { name: { in: demoCustomerNames } },
        select: { id: true, name: true, _count: { select: CUSTOMER_REFS } },
      });
      const isFree = (c: (typeof candidates)[number]) =>
        Object.values(c._count).every((n) => n === 0);
      const deletableIds = candidates.filter(isFree).map((c) => c.id);
      const kept = candidates.filter((c) => !isFree(c));

      const customers = await tx.customer.deleteMany({
        where: { id: { in: deletableIds } },
      });

      return { jobOrders: jobOrders.count, quotations: quotations.count, customers: customers.count, kept };
    },
    { timeout: 60_000 }
  );

  console.log("Removed seed data:");
  console.table({
    jobOrders: result.jobOrders,
    quotations: result.quotations,
    customers: result.customers,
  });
  if (result.kept.length > 0) {
    console.log(`Kept ${result.kept.length} seed customer(s) with real data attached:`);
    for (const c of result.kept) {
      const refs = Object.entries(c._count)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}=${n}`)
        .join(", ");
      console.log(`  • ${c.name} (${refs})`);
    }
  }
  console.log("Unseed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
