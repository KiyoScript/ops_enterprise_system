import { prisma } from "@/lib/prisma";

export type EmployeeRecord = {
  id: string;
  code: string;
  name: string;
  team: string | null;
  email: string | null;
  isActive: boolean;
};

const employeeSelect = {
  id: true,
  code: true,
  name: true,
  team: true,
  email: true,
  isActive: true,
} as const;

export type EmployeeCreateData = {
  code: string;
  name: string;
  team?: string | null;
  email?: string | null;
  createdById: string;
};

export interface IEmployeeRepository {
  list(includeInactive: boolean): Promise<EmployeeRecord[]>;
  findById(id: string): Promise<EmployeeRecord | null>;
  existsCode(code: string, excludeId?: string): Promise<boolean>;
  /** Returns the subset of codes already in the DB (case-insensitive). */
  filterExistingCodes(codes: string[]): Promise<string[]>;
  create(data: EmployeeCreateData): Promise<EmployeeRecord>;
  createMany(data: EmployeeCreateData[]): Promise<number>;
  update(
    id: string,
    data: {
      code?: string;
      name?: string;
      team?: string | null;
      email?: string | null;
      isActive?: boolean;
    }
  ): Promise<void>;
  delete(id: string): Promise<void>;
}

export class PrismaEmployeeRepository implements IEmployeeRepository {
  async list(includeInactive: boolean): Promise<EmployeeRecord[]> {
    return prisma.employee.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: employeeSelect,
      orderBy: [{ team: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string): Promise<EmployeeRecord | null> {
    return prisma.employee.findUnique({ where: { id }, select: employeeSelect });
  }

  async existsCode(code: string, excludeId?: string): Promise<boolean> {
    const found = await prisma.employee.findFirst({
      where: {
        code: { equals: code, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  async filterExistingCodes(codes: string[]): Promise<string[]> {
    if (codes.length === 0) return [];
    const found = await prisma.employee.findMany({
      where: { code: { in: codes, mode: "insensitive" } },
      select: { code: true },
    });
    return found.map((f) => f.code);
  }

  async create(data: EmployeeCreateData): Promise<EmployeeRecord> {
    return prisma.employee.create({ data, select: employeeSelect });
  }

  async createMany(data: EmployeeCreateData[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await prisma.employee.createMany({ data });
    return result.count;
  }

  async update(
    id: string,
    data: {
      code?: string;
      name?: string;
      team?: string | null;
      email?: string | null;
      isActive?: boolean;
    }
  ): Promise<void> {
    await prisma.employee.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.employee.delete({ where: { id } });
  }
}
