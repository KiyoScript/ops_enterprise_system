import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { JobOrderStatus } from "@/generated/prisma/enums";
import type { DbTx } from "@/modules/shared/repositories/types";

// ——— selection shapes (single source of truth for what queries fetch) ———

const listSelect = {
  id: true,
  joNumber: true,
  status: true,
  total: true,
  deadline: true,
  createdAt: true,
  importedAt: true,
  customer: { select: { name: true } },
  items: {
    select: {
      productionStatus: true,
      deadline: true,
      isRush: true,
      archivedAt: true,
      waitingPickupSince: true,
    },
  },
} satisfies Prisma.JobOrderSelect;

const detailSelect = {
  id: true,
  joNumber: true,
  status: true,
  notes: true,
  planDateStart: true,
  planDateEnd: true,
  deadline: true,
  total: true,
  isLFP: true,
  importedAt: true,
  createdAt: true,
  completedAt: true,
  customer: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.JobOrderSelect;

export type JobOrderListRecord = Prisma.JobOrderGetPayload<{
  select: typeof listSelect;
}>;
export type JobOrderDetailRecord = Prisma.JobOrderGetPayload<{
  select: typeof detailSelect;
}>;
export type JobOrderItemRecord = JobOrderDetailRecord["items"][number];

// ——— write payloads (plain data in, no Prisma types leak to services) ———

export type ItemCreateData = {
  description: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  specs?: Prisma.InputJsonValue;
  productionStatus?: string | null;
  department?: string | null;
  deadline?: Date | null;
  actualDate?: Date | null;
  assignedTo?: string | null;
  category?: string | null;
  isLFP?: boolean;
  lfpWidth?: string | null;
  lfpHeight?: string | null;
  lfpUnit?: string | null;
  isRush?: boolean;
  statusHistory?: string | null;
  waitingPickupSince?: Date | null;
  archivedAt?: Date | null;
  lineItemId?: string | null;
  sortOrder: number;
};

export type ItemUpdateData = Omit<
  ItemCreateData,
  "statusHistory" | "waitingPickupSince" | "archivedAt" | "actualDate"
>;

export type JobOrderCreateData = {
  joNumber: string;
  customerId: string;
  status: JobOrderStatus;
  deadline?: Date | null;
  planDateStart?: Date | null;
  planDateEnd?: Date | null;
  isLFP: boolean;
  subtotal: string;
  total: string;
  notes?: string | null;
  createdById: string;
  createdAt?: Date;
  completedAt?: Date | null;
  importedAt?: Date;
  items: ItemCreateData[];
};

export type JobOrderHeaderUpdateData = {
  customerId?: string;
  deadline?: Date | null;
  planDateStart?: Date | null;
  planDateEnd?: Date | null;
  isLFP?: boolean;
  subtotal?: string;
  total?: string;
  notes?: string | null;
};

export type ItemProductionUpdateData = {
  productionStatus: string;
  department: string | null;
  statusHistory: string;
  waitingPickupSince: Date | null;
  actualDate?: Date | null;
  archivedAt?: Date | null;
};

export type ItemProductionState = {
  id: string;
  productionStatus: string | null;
  archivedAt: Date | null;
  waitingPickupSince: Date | null;
};

export type ListFilter = {
  q?: string;
  view: "active" | "waiting" | "overdue" | "done" | "all";
  cursor?: string;
  take: number;
};

export interface IJobOrderRepository {
  withTransaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T>;
  listPage(
    filter: ListFilter
  ): Promise<{ rows: JobOrderListRecord[]; nextCursor: string | null }>;
  findDetail(id: string): Promise<JobOrderDetailRecord | null>;
  existsJoNumber(joNumber: string, excludeId?: string): Promise<boolean>;
  /** Returns the subset of joNumbers already in the DB (case-insensitive). */
  filterExistingJoNumbers(joNumbers: string[]): Promise<string[]>;
  createWithItems(
    data: JobOrderCreateData,
    tx?: DbTx
  ): Promise<{ id: string; joNumber: string }>;
  updateHeader(
    id: string,
    data: JobOrderHeaderUpdateData,
    tx?: DbTx
  ): Promise<void>;
  replaceItems(
    jobOrderId: string,
    ops: {
      create: ItemCreateData[];
      update: { id: string; data: ItemUpdateData }[];
      deleteIds: string[];
    },
    tx?: DbTx
  ): Promise<void>;
  findItem(
    jobOrderId: string,
    itemId: string,
    tx?: DbTx
  ): Promise<JobOrderItemRecord | null>;
  updateItemProduction(
    itemId: string,
    data: ItemProductionUpdateData,
    tx?: DbTx
  ): Promise<void>;
  getItemsProduction(jobOrderId: string, tx?: DbTx): Promise<ItemProductionState[]>;
  setJoStatus(
    id: string,
    status: JobOrderStatus,
    completedAt: Date | null,
    tx?: DbTx
  ): Promise<void>;
  addJoStatusHistory(
    entry: {
      jobOrderId: string;
      fromStatus: JobOrderStatus | null;
      toStatus: JobOrderStatus;
      changedById: string;
      remarks?: string;
    },
    tx?: DbTx
  ): Promise<void>;
  softDelete(id: string, tx?: DbTx): Promise<void>;
}

const OPEN_STATUSES: JobOrderStatus[] = [
  JobOrderStatus.DRAFT,
  JobOrderStatus.PENDING_REVIEW,
  JobOrderStatus.APPROVED,
  JobOrderStatus.IN_PROGRESS,
];

export class PrismaJobOrderRepository implements IJobOrderRepository {
  withTransaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }

  async listPage(
    filter: ListFilter
  ): Promise<{ rows: JobOrderListRecord[]; nextCursor: string | null }> {
    const where: Prisma.JobOrderWhereInput = { deletedAt: null };

    if (filter.q) {
      where.OR = [
        { joNumber: { contains: filter.q, mode: "insensitive" } },
        { customer: { name: { contains: filter.q, mode: "insensitive" } } },
      ];
    }

    const now = new Date();
    switch (filter.view) {
      case "active":
        where.status = { in: OPEN_STATUSES };
        break;
      case "done":
        where.status = JobOrderStatus.COMPLETED;
        break;
      case "waiting":
        where.items = {
          some: { waitingPickupSince: { not: null }, archivedAt: null },
        };
        break;
      case "overdue":
        // Legacy rule: past-deadline items don't count once they are waiting
        // for pickup/delivery or archived as done.
        where.status = {
          notIn: [JobOrderStatus.COMPLETED, JobOrderStatus.CANCELLED],
        };
        where.items = {
          some: {
            deadline: { lt: now },
            archivedAt: null,
            waitingPickupSince: null,
          },
        };
        break;
      case "all":
        break;
    }

    const rows = await prisma.jobOrder.findMany({
      where,
      select: listSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

  async findDetail(id: string): Promise<JobOrderDetailRecord | null> {
    return prisma.jobOrder.findFirst({
      where: { id, deletedAt: null },
      select: detailSelect,
    });
  }

  async existsJoNumber(joNumber: string, excludeId?: string): Promise<boolean> {
    const found = await prisma.jobOrder.findFirst({
      where: {
        joNumber: { equals: joNumber, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  async filterExistingJoNumbers(joNumbers: string[]): Promise<string[]> {
    if (joNumbers.length === 0) return [];
    const found = await prisma.jobOrder.findMany({
      where: { joNumber: { in: joNumbers, mode: "insensitive" } },
      select: { joNumber: true },
    });
    return found.map((f) => f.joNumber);
  }

  async createWithItems(
    data: JobOrderCreateData,
    tx?: DbTx
  ): Promise<{ id: string; joNumber: string }> {
    const { items, ...header } = data;
    return (tx ?? prisma).jobOrder.create({
      data: { ...header, items: { create: items } },
      select: { id: true, joNumber: true },
    });
  }

  async updateHeader(
    id: string,
    data: JobOrderHeaderUpdateData,
    tx?: DbTx
  ): Promise<void> {
    await (tx ?? prisma).jobOrder.update({ where: { id }, data });
  }

  async replaceItems(
    jobOrderId: string,
    ops: {
      create: ItemCreateData[];
      update: { id: string; data: ItemUpdateData }[];
      deleteIds: string[];
    },
    tx?: DbTx
  ): Promise<void> {
    const db = tx ?? prisma;
    if (ops.deleteIds.length > 0) {
      await db.jobOrderItem.deleteMany({
        where: { id: { in: ops.deleteIds }, jobOrderId },
      });
    }
    for (const { id, data } of ops.update) {
      await db.jobOrderItem.update({ where: { id }, data });
    }
    if (ops.create.length > 0) {
      await db.jobOrderItem.createMany({
        data: ops.create.map((item) => ({ ...item, jobOrderId })),
      });
    }
  }

  async findItem(
    jobOrderId: string,
    itemId: string,
    tx?: DbTx
  ): Promise<JobOrderItemRecord | null> {
    return (tx ?? prisma).jobOrderItem.findFirst({
      where: { id: itemId, jobOrderId },
    });
  }

  async updateItemProduction(
    itemId: string,
    data: ItemProductionUpdateData,
    tx?: DbTx
  ): Promise<void> {
    await (tx ?? prisma).jobOrderItem.update({ where: { id: itemId }, data });
  }

  async getItemsProduction(
    jobOrderId: string,
    tx?: DbTx
  ): Promise<ItemProductionState[]> {
    return (tx ?? prisma).jobOrderItem.findMany({
      where: { jobOrderId },
      select: {
        id: true,
        productionStatus: true,
        archivedAt: true,
        waitingPickupSince: true,
      },
    });
  }

  async setJoStatus(
    id: string,
    status: JobOrderStatus,
    completedAt: Date | null,
    tx?: DbTx
  ): Promise<void> {
    await (tx ?? prisma).jobOrder.update({
      where: { id },
      data: { status, completedAt },
    });
  }

  async addJoStatusHistory(
    entry: {
      jobOrderId: string;
      fromStatus: JobOrderStatus | null;
      toStatus: JobOrderStatus;
      changedById: string;
      remarks?: string;
    },
    tx?: DbTx
  ): Promise<void> {
    await (tx ?? prisma).jobOrderStatusHistory.create({ data: entry });
  }

  async softDelete(id: string, tx?: DbTx): Promise<void> {
    await (tx ?? prisma).jobOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
