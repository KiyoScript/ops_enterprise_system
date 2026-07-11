import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { JobOrderStatus, DeliveryReceiptStatus } from "@/generated/prisma/enums";
import type { DbTx } from "@/modules/shared/repositories/types";

// ——— selection shapes ———

const deliverableItemSelect = {
  id: true,
  description: true,
  qty: true,
  qtyDelivered: true,
  unitPrice: true,
  lineTotal: true,
  lineItemId: true,
  jobOrder: {
    select: {
      id: true,
      joNumber: true,
      completedAt: true,
      customer: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.JobOrderItemSelect;

const drListSelect = {
  id: true,
  drNumber: true,
  status: true,
  isFullDelivery: true,
  issuedAt: true,
  jobOrder: { select: { joNumber: true } },
  customer: { select: { name: true } },
  lines: {
    select: {
      qty: true,
      jobOrderItem: { select: { description: true, unitPrice: true } },
    },
  },
} satisfies Prisma.DeliveryReceiptSelect;

const drDetailSelect = {
  id: true,
  drNumber: true,
  status: true,
  isFullDelivery: true,
  issuedAt: true,
  notes: true,
  createdBy: { select: { name: true } },
  jobOrder: { select: { id: true, joNumber: true } },
  customer: {
    select: { id: true, name: true, address: true, tin: true, company: true },
  },
  lines: {
    select: {
      id: true,
      qty: true,
      jobOrderItem: {
        select: { description: true, lineItemId: true, unitPrice: true },
      },
    },
  },
} satisfies Prisma.DeliveryReceiptSelect;

// Every line item of a JO (done or not) — the universe used to decide whether
// a DR is a Full or Partial delivery (all items on the DR = Full, subset =
// Partial) and to drive the edit picker.
const joItemSelect = {
  id: true,
  lineItemId: true,
  description: true,
  qty: true,
  qtyDelivered: true,
  unitPrice: true,
  archivedAt: true,
} satisfies Prisma.JobOrderItemSelect;

export type DeliverableItemRecord = Prisma.JobOrderItemGetPayload<{
  select: typeof deliverableItemSelect;
}>;
export type JoItemRecord = Prisma.JobOrderItemGetPayload<{
  select: typeof joItemSelect;
}>;
export type DrListRecord = Prisma.DeliveryReceiptGetPayload<{
  select: typeof drListSelect;
}>;
export type DrDetailRecord = Prisma.DeliveryReceiptGetPayload<{
  select: typeof drDetailSelect;
}>;

export type DrLineCreate = { jobOrderItemId: string; qty: number };
export type DrCreateData = {
  drNumber: string;
  jobOrderId: string;
  customerId: string;
  isFullDelivery: boolean;
  notes?: string | null;
  createdById: string;
  lines: DrLineCreate[];
};

export type DrListFilter = { q?: string; cursor?: string; take: number };

export type DrMetricsRaw = {
  pendingDeliveries: number;
  issuedToday: number;
  issuedThisMonth: number;
  partialThisMonth: number;
};

export interface IDeliveryReceiptRepository {
  withTransaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T>;
  /** Done items (production finished) of non-cancelled JOs — the service
   *  drops any whose quantity is already fully delivered. With `jobOrderId`,
   *  returns every item of that JO; otherwise a recent, optionally
   *  search-filtered slice for the issue picker. */
  listDeliverableItems(opts?: {
    jobOrderId?: string;
    q?: string;
  }): Promise<DeliverableItemRecord[]>;
  drNumberExists(drNumber: string, tx?: DbTx): Promise<boolean>;
  nextCounter(key: string, tx: DbTx): Promise<number>;
  createDr(
    data: DrCreateData,
    tx: DbTx
  ): Promise<{ id: string; drNumber: string }>;
  incrementDelivered(itemId: string, by: number, tx: DbTx): Promise<void>;
  listPage(
    filter: DrListFilter
  ): Promise<{ rows: DrListRecord[]; nextCursor: string | null }>;
  findDetail(id: string): Promise<DrDetailRecord | null>;
  getMetrics(): Promise<DrMetricsRaw>;
  getLinesForCancel(
    id: string
  ): Promise<{ status: DeliveryReceiptStatus; lines: DrLineCreate[] } | null>;
  setCancelled(id: string, tx: DbTx): Promise<void>;
  /** All line items of a JO (done or not), ordered as entered. */
  listJoItems(jobOrderId: string): Promise<JoItemRecord[]>;
  findForEdit(id: string): Promise<{
    status: DeliveryReceiptStatus;
    jobOrderId: string;
    lines: DrLineCreate[];
  } | null>;
  replaceLines(id: string, lines: DrLineCreate[], tx: DbTx): Promise<void>;
  setDeliveryState(
    id: string,
    data: { isFullDelivery: boolean; notes: string | null },
    tx: DbTx
  ): Promise<void>;
}

export class PrismaDeliveryReceiptRepository
  implements IDeliveryReceiptRepository
{
  withTransaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }

  async listDeliverableItems(
    opts: { jobOrderId?: string; q?: string } = {}
  ): Promise<DeliverableItemRecord[]> {
    const { jobOrderId, q } = opts;
    const joWhere: Prisma.JobOrderWhereInput = {
      deletedAt: null,
      status: { not: JobOrderStatus.CANCELLED },
      ...(jobOrderId ? { id: jobOrderId } : {}),
    };
    if (q) {
      joWhere.OR = [
        { joNumber: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    return prisma.jobOrderItem.findMany({
      where: { archivedAt: { not: null }, jobOrder: joWhere }, // done / finished
      select: deliverableItemSelect,
      // A specific JO → all its items in order; the picker → most-recently
      // finished first, capped so the search stays fast.
      orderBy: jobOrderId
        ? [{ sortOrder: "asc" }]
        : [{ archivedAt: "desc" }, { id: "desc" }],
      ...(jobOrderId ? {} : { take: 400 }),
    });
  }

  async drNumberExists(drNumber: string, tx?: DbTx): Promise<boolean> {
    const found = await (tx ?? prisma).deliveryReceipt.findFirst({
      where: { drNumber: { equals: drNumber, mode: "insensitive" } },
      select: { id: true },
    });
    return !!found;
  }

  async nextCounter(key: string, tx: DbTx): Promise<number> {
    const counter = await tx.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    return counter.value;
  }

  async createDr(
    data: DrCreateData,
    tx: DbTx
  ): Promise<{ id: string; drNumber: string }> {
    const { lines, ...header } = data;
    return tx.deliveryReceipt.create({
      data: { ...header, lines: { create: lines } },
      select: { id: true, drNumber: true },
    });
  }

  async incrementDelivered(
    itemId: string,
    by: number,
    tx: DbTx
  ): Promise<void> {
    await tx.jobOrderItem.update({
      where: { id: itemId },
      data: { qtyDelivered: { increment: by } },
    });
  }

  async listPage(
    filter: DrListFilter
  ): Promise<{ rows: DrListRecord[]; nextCursor: string | null }> {
    const where: Prisma.DeliveryReceiptWhereInput = { deletedAt: null };
    if (filter.q) {
      where.OR = [
        { drNumber: { contains: filter.q, mode: "insensitive" } },
        { jobOrder: { joNumber: { contains: filter.q, mode: "insensitive" } } },
        { customer: { name: { contains: filter.q, mode: "insensitive" } } },
      ];
    }
    const rows = await prisma.deliveryReceipt.findMany({
      where,
      select: drListSelect,
      orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
      take: filter.take + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > filter.take;
    const page = hasMore ? rows.slice(0, filter.take) : rows;
    return {
      rows: page,
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }

  async findDetail(id: string): Promise<DrDetailRecord | null> {
    return prisma.deliveryReceipt.findFirst({
      where: { id, deletedAt: null },
      select: drDetailSelect,
    });
  }

  async getMetrics(): Promise<DrMetricsRaw> {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayStart.getTime() + 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const notCancelled: Prisma.DeliveryReceiptWhereInput = {
      deletedAt: null,
      status: DeliveryReceiptStatus.ISSUED,
    };

    // Pending = distinct JOs with a done item that still has undelivered qty.
    // Column-to-column compare (qtyDelivered < qty) needs raw SQL.
    const pendingRows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT ji."jobOrderId")::int AS count
      FROM "JobOrderItem" ji
      JOIN "JobOrder" jo ON jo.id = ji."jobOrderId"
      WHERE ji."archivedAt" IS NOT NULL
        AND ji."qtyDelivered" < ji."qty"
        AND jo."deletedAt" IS NULL
        AND jo."status"::text <> 'CANCELLED'`;

    const [issuedToday, issuedThisMonth, partialThisMonth] = await Promise.all([
      prisma.deliveryReceipt.count({
        where: { ...notCancelled, issuedAt: { gte: dayStart, lt: nextDay } },
      }),
      prisma.deliveryReceipt.count({
        where: { ...notCancelled, issuedAt: { gte: monthStart, lt: nextMonth } },
      }),
      prisma.deliveryReceipt.count({
        where: {
          ...notCancelled,
          isFullDelivery: false,
          issuedAt: { gte: monthStart, lt: nextMonth },
        },
      }),
    ]);

    return {
      pendingDeliveries: pendingRows[0]?.count ?? 0,
      issuedToday,
      issuedThisMonth,
      partialThisMonth,
    };
  }

  async getLinesForCancel(
    id: string
  ): Promise<{ status: DeliveryReceiptStatus; lines: DrLineCreate[] } | null> {
    const dr = await prisma.deliveryReceipt.findFirst({
      where: { id, deletedAt: null },
      select: {
        status: true,
        lines: { select: { jobOrderItemId: true, qty: true } },
      },
    });
    return dr ?? null;
  }

  async setCancelled(id: string, tx: DbTx): Promise<void> {
    await tx.deliveryReceipt.update({
      where: { id },
      data: { status: DeliveryReceiptStatus.CANCELLED },
    });
  }

  async listJoItems(jobOrderId: string): Promise<JoItemRecord[]> {
    return prisma.jobOrderItem.findMany({
      where: { jobOrderId },
      select: joItemSelect,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  async findForEdit(id: string): Promise<{
    status: DeliveryReceiptStatus;
    jobOrderId: string;
    lines: DrLineCreate[];
  } | null> {
    const dr = await prisma.deliveryReceipt.findFirst({
      where: { id, deletedAt: null },
      select: {
        status: true,
        jobOrderId: true,
        lines: { select: { jobOrderItemId: true, qty: true } },
      },
    });
    return dr ?? null;
  }

  async replaceLines(
    id: string,
    lines: DrLineCreate[],
    tx: DbTx
  ): Promise<void> {
    await tx.deliveryReceiptLine.deleteMany({ where: { deliveryReceiptId: id } });
    if (lines.length > 0) {
      await tx.deliveryReceiptLine.createMany({
        data: lines.map((l) => ({ ...l, deliveryReceiptId: id })),
      });
    }
  }

  async setDeliveryState(
    id: string,
    data: { isFullDelivery: boolean; notes: string | null },
    tx: DbTx
  ): Promise<void> {
    await tx.deliveryReceipt.update({ where: { id }, data });
  }
}
