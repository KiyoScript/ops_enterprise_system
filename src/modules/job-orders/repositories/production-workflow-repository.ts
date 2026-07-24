import { prisma } from "@/lib/prisma";

export type GlobalStepRecord = {
  id: string;
  name: string;
  rankFromEnd: number;
  isActive: boolean;
};

const select = { id: true, name: true, rankFromEnd: true, isActive: true } as const;

export interface IProductionWorkflowRepository {
  list(includeInactive: boolean): Promise<GlobalStepRecord[]>;
  findById(id: string): Promise<GlobalStepRecord | null>;
  create(data: { name: string; rankFromEnd: number }): Promise<GlobalStepRecord>;
  update(
    id: string,
    data: { name?: string; rankFromEnd?: number; isActive?: boolean }
  ): Promise<void>;
  delete(id: string): Promise<void>;
}

export class PrismaProductionWorkflowRepository
  implements IProductionWorkflowRepository
{
  async list(includeInactive: boolean): Promise<GlobalStepRecord[]> {
    return prisma.globalProductionStep.findMany({
      where: includeInactive ? {} : { isActive: true },
      // Workflow order: highest rank first, rank 1 (the last step) last.
      orderBy: [{ rankFromEnd: "desc" }, { name: "asc" }],
      select,
    });
  }

  async findById(id: string): Promise<GlobalStepRecord | null> {
    return prisma.globalProductionStep.findUnique({ where: { id }, select });
  }

  async create(data: { name: string; rankFromEnd: number }): Promise<GlobalStepRecord> {
    return prisma.globalProductionStep.create({ data, select });
  }

  async update(
    id: string,
    data: { name?: string; rankFromEnd?: number; isActive?: boolean }
  ): Promise<void> {
    await prisma.globalProductionStep.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.globalProductionStep.delete({ where: { id } });
  }
}
