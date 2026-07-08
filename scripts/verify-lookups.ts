import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getLookupService } from "../src/modules/shared/services/lookup-service";
import type { Actor } from "../src/lib/authz";

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const actor: Actor = { id: admin.id, role: admin.role };
  const viewer: Actor = { id: admin.id, role: "VIEWER" };
  const svc = getLookupService();
  let fails = 0;
  const check = (n: string, c: boolean, x?: unknown) => { if (c) console.log("  ✓ " + n); else { fails++; console.error("  ✗ " + n, x ?? ""); } };

  const statuses = await svc.list(actor, "JO_STATUS");
  check("seeded statuses listed (7)", statuses.length === 7, statuses.length);

  const emp = await svc.create(actor, { type: "JO_EMPLOYEE", label: "Verify Employee" });
  check("employee created", emp.label === "Verify Employee");
  let dup = ""; try { await svc.create(actor, { type: "JO_EMPLOYEE", label: "verify employee" }); } catch (e) { dup = (e as Error).constructor.name; }
  check("case-insensitive duplicate rejected", dup === "ConflictError", dup);

  const cat = await svc.create(actor, { type: "JO_CATEGORY", label: "Verify Tarp", isLFP: true });
  check("LFP category created", cat.isLFP === true);

  await svc.update(actor, { id: emp.id, isActive: false });
  const activeEmps = await svc.list(actor, "JO_EMPLOYEE");
  check("deactivated hidden from active list", !activeEmps.some(e => e.id === emp.id));
  const allEmps = await svc.list(actor, "JO_EMPLOYEE", true);
  check("deactivated visible with includeInactive", allEmps.some(e => e.id === emp.id && !e.isActive));

  let forb = ""; try { await svc.create(viewer, { type: "JO_EMPLOYEE", label: "Nope" }); } catch (e) { forb = (e as Error).constructor.name; }
  check("VIEWER cannot maintain", forb === "ForbiddenError", forb);

  await svc.remove(actor, emp.id);
  await svc.remove(actor, cat.id);
  const after = await svc.list(actor, "JO_EMPLOYEE", true);
  check("deleted removed", !after.some(e => e.id === emp.id));

  console.log(fails === 0 ? "ALL LOOKUP CHECKS PASSED" : fails + " FAILED");
  process.exitCode = fails ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
