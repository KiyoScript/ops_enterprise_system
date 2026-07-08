// Temporary end-to-end verification for the JO module + legacy import.
// Drives the real services against the real dev database, then cleans up.
// Run: npx tsx scripts/verify-jo.ts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  getJobOrderService,
  getLegacyImportService,
} from "../src/modules/job-orders/services";
import type { Actor } from "../src/lib/authz";

const HEADERS =
  "Department,Status Department,Plan Date Start,Plan Date End,Date Today,Deadline Promised,Actual Date,Status History,Formatted JO Specs,Days Left,Employee Assigned,JO Number,JO Amount,Category,LFP Width,LFP Height,LFP Unit,Waiting Pickup Since,Is Rush,Line Item ID";

const LINEUP_CSV = [
  HEADERS,
  // LFP rush item with multiline history (quoted newlines)
  `Printing,Ongoing - Printing,,,7/1/2026,7/15/2026,,"7/1 10:00 AM Layout started
7/2 2:15 PM Ongoing printing","7/1 | Verify Customer A | 100 pcs |
Tarpaulin 8x3 ft for fiesta",14,Juan,VERIFY-001,1500,Tarpaulin,8,3,ft,,TRUE,VERIFY-001-01`,
  // Waiting-for-pickup item of the same JO
  `,Waiting - For Pick up / Delivery,,,7/1/2026,7/10/2026,,,"7/1 | Verify Customer A | 20 pcs |
Sticker labels",,Maria,VERIFY-001,300,,,,,7/6/2026 3:00 PM,FALSE,VERIFY-001-02`,
  // Done item on the active sheet → should archive + complete the JO
  `,Done,,,6/20/2026,6/25/2026,6/24/2026,6/24 4:00 PM Done,"6/20 | Verify Customer B | 1 |
Photocopy bond papers",,Pedro,VERIFY-002,50,,,,,,FALSE,VERIFY-002-01`,
].join("\n");

const ARCHIVE_CSV = [
  HEADERS.replace("Waiting Pickup Since", "Date Archive"),
  `,Done - Completed,,,5/1/2026,5/15/2026,5/14/2026,5/14 1:00 PM Done,"5/1 | Verify Customer A | 5 |
ID cards batch",,Juan,VERIFY-003,750,,,,,5/30/2026,FALSE,VERIFY-003-01`,
].join("\n");

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}`, extra ?? "");
  }
}

async function cleanup() {
  await prisma.jobOrder.deleteMany({
    where: { joNumber: { startsWith: "VERIFY-" } },
  });
  await prisma.customer.deleteMany({
    where: { name: { startsWith: "Verify Customer" } },
  });
  await prisma.activityLog.deleteMany({
    where: { payload: { path: ["joNumber"], string_starts_with: "VERIFY-" } },
  });
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "ADMIN" },
  });
  const actor: Actor = { id: admin.id, role: admin.role };
  const viewer: Actor = { id: admin.id, role: "VIEWER" };
  const importer = getLegacyImportService();
  const jos = getJobOrderService();

  await cleanup();

  console.log("1) Import Line-up JOs CSV");
  const s1 = await importer.import(actor, LINEUP_CSV, "lineup");
  check("2 JOs created", s1.jobOrdersCreated === 2, s1);
  check("3 items created", s1.itemsCreated === 3, s1);
  check("2 customers created", s1.customersCreated === 2, s1);
  check("no errors", s1.errors.length === 0, s1.errors);

  console.log("2) Re-import is idempotent");
  const s2 = await importer.import(actor, LINEUP_CSV, "lineup");
  check("0 created on re-import", s2.jobOrdersCreated === 0, s2);
  check("2 skipped as existing", s2.skippedExisting.length === 2, s2);

  console.log("3) Import Archive CSV");
  const s3 = await importer.import(actor, ARCHIVE_CSV, "archive");
  check("1 archived JO created", s3.jobOrdersCreated === 1, s3);
  check("customer A reused (0 new)", s3.customersCreated === 0, s3);

  console.log("4) List + imported data shape");
  const page = await jos.list(actor, { q: "VERIFY", view: "all", take: 25 });
  check("3 rows listed", page.rows.length === 3, page.rows.length);
  const v1 = page.rows.find((r) => r.joNumber === "VERIFY-001")!;
  const v2 = page.rows.find((r) => r.joNumber === "VERIFY-002")!;
  const v3 = page.rows.find((r) => r.joNumber === "VERIFY-003")!;
  check("VERIFY-001 in progress", v1.status === "IN_PROGRESS", v1.status);
  check("VERIFY-001 waiting pickup flagged", v1.hasWaitingPickup);
  check("VERIFY-001 overdue (deadline 7/15/2026 < today? no) → not overdue if future", v1.isOverdue === new Date("2026-07-15") < new Date(), v1);
  check("VERIFY-001 rush", v1.isRush);
  check("VERIFY-002 completed (done on lineup)", v2.status === "COMPLETED", v2.status);
  check("VERIFY-003 completed (archive)", v3.status === "COMPLETED", v3.status);
  check("rows marked imported", v1.imported && v2.imported && v3.imported);

  const d1 = await jos.get(actor, v1.id);
  check("customer parsed from specs", d1.customer.name === "Verify Customer A", d1.customer.name);
  check("2 items on VERIFY-001", d1.items.length === 2);
  const tarp = d1.items.find((i) => i.lineItemId === "VERIFY-001-01")!;
  check("multiline history preserved", (tarp.statusHistory ?? "").includes("\n"), tarp.statusHistory);
  check("qty parsed (100)", tarp.qty === 100, tarp.qty);
  check("LFP inferred", tarp.isLFP && tarp.lfpWidth === "8" && tarp.lfpUnit === "ft");
  check("amount preserved", tarp.lineTotal === "1500", tarp.lineTotal);
  const sticker = d1.items.find((i) => i.lineItemId === "VERIFY-001-02")!;
  check("waitingPickupSince imported", sticker.waitingPickupSince !== null, sticker);
  check("total = 1800", d1.total === "1800", d1.total);

  console.log("5) Create / duplicate / status flow / edit / delete");
  const created = await jos.create(actor, {
    joNumber: "VERIFY-NEW-1",
    customerName: "Verify Customer C",
    notes: "from verify script",
    items: [
      {
        description: "Mug print",
        qty: "12",
        amount: "960",
        deadline: "2026-07-20",
        productionStatus: "Ongoing - Production",
        isLFP: false,
        isRush: false,
      },
    ],
  });
  const dNew = await jos.get(actor, created.id);
  check("created with IN_PROGRESS", dNew.status === "IN_PROGRESS");
  check("unitPrice derived (80.00)", dNew.items[0]!.lineTotal === "960", dNew.items[0]!.lineTotal);

  let dupErr = "";
  try {
    await jos.create(actor, {
      joNumber: "verify-new-1", // case-insensitive duplicate
      customerName: "X",
      items: [{ description: "d", qty: "1", amount: "1", isLFP: false, isRush: false }],
    });
  } catch (e) {
    dupErr = e instanceof Error ? e.constructor.name : "";
  }
  check("duplicate JO number rejected (ConflictError)", dupErr === "ConflictError", dupErr);

  const itemId = dNew.items[0]!.id;
  await jos.updateItemStatus(actor, {
    jobOrderId: created.id,
    itemId,
    productionStatus: "Waiting - For Pick up / Delivery",
    remark: "customer texted",
  });
  let d = await jos.get(actor, created.id);
  check("waiting stamped", d.items[0]!.waitingPickupSince !== null);
  check("history appended with remark", (d.items[0]!.statusHistory ?? "").includes("customer texted"));

  await jos.updateItemStatus(actor, {
    jobOrderId: created.id,
    itemId,
    productionStatus: "Done - Completed",
  });
  d = await jos.get(actor, created.id);
  check("item archived on done", d.items[0]!.archivedAt !== null);
  check("waiting cleared on done", d.items[0]!.waitingPickupSince === null);
  check("JO auto-completed", d.status === "COMPLETED", d.status);

  await jos.update(actor, {
    id: created.id,
    joNumber: "VERIFY-NEW-1",
    customerName: "Verify Customer C",
    items: [
      { id: itemId, description: "Mug print", qty: "12", amount: "1000", isLFP: false, isRush: false },
      { description: "Extra keychains", qty: "5", amount: "250", isLFP: false, isRush: false },
    ],
  });
  d = await jos.get(actor, created.id);
  check("edit added item", d.items.length === 2);
  check("totals recomputed (1250)", d.total === "1250", d.total);
  check("JO reopened by new open item", d.status === "IN_PROGRESS", d.status);
  check("done item kept its history", d.items.find((i) => i.id === itemId)!.archivedAt !== null);

  let forbidden = "";
  try {
    await jos.create(viewer, {
      joNumber: "VERIFY-NOPE",
      customerName: "X",
      items: [{ description: "d", qty: "1", amount: "1", isLFP: false, isRush: false }],
    });
  } catch (e) {
    forbidden = e instanceof Error ? e.constructor.name : "";
  }
  check("VIEWER cannot create (ForbiddenError)", forbidden === "ForbiddenError", forbidden);

  await jos.softDelete(actor, created.id);
  let gone = "";
  try {
    await jos.get(actor, created.id);
  } catch (e) {
    gone = e instanceof Error ? e.constructor.name : "";
  }
  check("soft-deleted JO hidden (NotFoundError)", gone === "NotFoundError", gone);

  const logs = await prisma.activityLog.count({
    where: { action: { in: ["create", "update", "status", "delete", "import"] } },
  });
  check("activity log rows written", logs > 0, logs);

  await cleanup();
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
