import { z } from "zod";

// Employee master (legacy EMPDATABASE: Code / Team / Name / Email).
export const employeeCreateInput = z.object({
  code: z.string().trim().min(1, "Employee code is required").max(40),
  name: z.string().trim().min(1, "Name is required").max(200),
  team: z.string().trim().max(80).optional(),
  email: z.string().trim().max(200).optional(),
});

export const employeeUpdateInput = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  team: z.string().trim().max(80).optional(),
  email: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
});

export const employeeDeleteInput = z.object({ id: z.string().min(1) });

export type EmployeeCreateInput = z.infer<typeof employeeCreateInput>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateInput>;

export type EmployeeDto = {
  id: string;
  code: string;
  name: string;
  team: string | null;
  email: string | null;
  isActive: boolean;
};

export type EmployeeImportSummaryDto = {
  created: number;
  skippedExisting: string[];
  errors: { line: number; message: string }[];
};
