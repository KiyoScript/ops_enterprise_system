import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertRole, type Actor } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import type {
  EmployeeCreateData,
  IEmployeeRepository,
} from "../repositories/employee-repository";
import { PrismaEmployeeRepository } from "../repositories/employee-repository";
import type { IActivityLogRepository } from "../repositories/activity-log-repository";
import { PrismaActivityLogRepository } from "../repositories/activity-log-repository";
import type {
  EmployeeCreateInput,
  EmployeeDto,
  EmployeeImportSummaryDto,
  EmployeeUpdateInput,
} from "../schemas/employee";

const MAINTAINER_ROLES = [Role.ADMIN, Role.MANAGER] as const;

// Legacy EMPDATABASE sheet columns.
const COL = { code: 0, team: 1, name: 2, email: 3 } as const;

export class EmployeeService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly activity: IActivityLogRepository
  ) {}

  async list(_actor: Actor, includeInactive = false): Promise<EmployeeDto[]> {
    return this.employees.list(includeInactive);
  }

  async create(actor: Actor, input: EmployeeCreateInput): Promise<EmployeeDto> {
    assertRole(actor, MAINTAINER_ROLES);
    if (await this.employees.existsCode(input.code)) {
      throw new ConflictError(`Employee code "${input.code}" already exists.`);
    }
    const created = await this.employees.create({
      code: input.code,
      name: input.name,
      team: input.team || null,
      email: input.email || null,
      createdById: actor.id,
    });
    await this.activity.log({
      userId: actor.id,
      entityType: "Employee",
      entityId: created.id,
      action: "create",
      payload: { code: created.code, name: created.name },
    });
    return created;
  }

  async update(actor: Actor, input: EmployeeUpdateInput): Promise<void> {
    assertRole(actor, MAINTAINER_ROLES);
    const existing = await this.employees.findById(input.id);
    if (!existing) throw new NotFoundError("Employee not found.");
    if (
      input.code &&
      (await this.employees.existsCode(input.code, input.id))
    ) {
      throw new ConflictError(`Employee code "${input.code}" already exists.`);
    }
    await this.employees.update(input.id, {
      code: input.code,
      name: input.name,
      team: input.team === undefined ? undefined : input.team || null,
      email: input.email === undefined ? undefined : input.email || null,
      isActive: input.isActive,
    });
    await this.activity.log({
      userId: actor.id,
      entityType: "Employee",
      entityId: input.id,
      action: "update",
      payload: { code: input.code ?? existing.code, isActive: input.isActive },
    });
  }

  async remove(actor: Actor, id: string): Promise<void> {
    assertRole(actor, MAINTAINER_ROLES);
    const existing = await this.employees.findById(id);
    if (!existing) throw new NotFoundError("Employee not found.");
    // JO items store the employee CODE as plain text, so history survives.
    await this.employees.delete(id);
    await this.activity.log({
      userId: actor.id,
      entityType: "Employee",
      entityId: id,
      action: "delete",
      payload: { code: existing.code },
    });
  }

  /** Import the legacy EMPDATABASE sheet (A=Code, B=Team, C=Name, D=Email).
   *  `rows` come from fileToRows (CSV or XLSX). Existing codes are skipped,
   *  so re-imports are safe. */
  async importRows(
    actor: Actor,
    rows: string[][]
  ): Promise<EmployeeImportSummaryDto> {
    assertRole(actor, MAINTAINER_ROLES);

    const summary: EmployeeImportSummaryDto = {
      created: 0,
      skippedExisting: [],
      errors: [],
    };

    if (rows.length === 0) throw new ValidationError("The file is empty.");

    const parsed: (EmployeeCreateData & { line: number })[] = [];
    const seen = new Set<string>();
    rows.forEach((cells, index) => {
      const code = (cells[COL.code] ?? "").trim();
      if (!code) return;
      if (code.toLowerCase() === "employee code") return; // header row
      const name = (cells[COL.name] ?? "").trim();
      if (!name) {
        summary.errors.push({
          line: index + 1,
          message: `${code}: name (column C) is empty`,
        });
        return;
      }
      if (seen.has(code.toLowerCase())) {
        summary.errors.push({
          line: index + 1,
          message: `${code}: duplicated in the file`,
        });
        return;
      }
      seen.add(code.toLowerCase());
      parsed.push({
        line: index + 1,
        code,
        name,
        team: (cells[COL.team] ?? "").trim() || null,
        email: (cells[COL.email] ?? "").trim() || null,
        createdById: actor.id,
      });
    });
    if (parsed.length === 0 && summary.errors.length === 0) {
      throw new ValidationError(
        "No employee rows found. Upload the EMPDATABASE sheet as .csv or .xlsx (columns: Employee Code, Team, Name of Employee, Email)."
      );
    }

    const existing = new Set(
      (await this.employees.filterExistingCodes(parsed.map((p) => p.code))).map(
        (c) => c.toLowerCase()
      )
    );
    const toCreate = parsed.filter((p) => {
      if (existing.has(p.code.toLowerCase())) {
        summary.skippedExisting.push(p.code);
        return false;
      }
      return true;
    });

    summary.created = await this.employees.createMany(
      toCreate.map((p) => ({
        code: p.code,
        name: p.name,
        team: p.team,
        email: p.email,
        createdById: p.createdById,
      }))
    );
    await this.activity.log({
      userId: actor.id,
      entityType: "Employee",
      entityId: "empdatabase-import",
      action: "import",
      payload: {
        created: summary.created,
        skipped: summary.skippedExisting.length,
        errors: summary.errors.length,
      },
    });
    return summary;
  }
}

let instance: EmployeeService | undefined;

export function getEmployeeService(): EmployeeService {
  instance ??= new EmployeeService(
    new PrismaEmployeeRepository(),
    new PrismaActivityLogRepository()
  );
  return instance;
}
