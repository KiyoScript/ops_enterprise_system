import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { DbTx } from "./types";

export type ActivityEntry = {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Prisma.InputJsonValue;
};

export interface IActivityLogRepository {
  log(entry: ActivityEntry, tx?: DbTx): Promise<void>;
  logMany(entries: ActivityEntry[], tx?: DbTx): Promise<void>;
}

export class PrismaActivityLogRepository implements IActivityLogRepository {
  async log(entry: ActivityEntry, tx?: DbTx): Promise<void> {
    await (tx ?? prisma).activityLog.create({ data: entry });
  }

  async logMany(entries: ActivityEntry[], tx?: DbTx): Promise<void> {
    if (entries.length === 0) return;
    await (tx ?? prisma).activityLog.createMany({ data: entries });
  }
}
