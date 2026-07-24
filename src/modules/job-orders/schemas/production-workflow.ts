import { z } from "zod";

/** One step of the single global production workflow. */
export type GlobalStepDto = {
  id: string;
  name: string;
  rankFromEnd: number; // 1 = last step, 2 = 2nd-to-last, …
  isActive: boolean;
};

export const globalStepCreateInput = z.object({
  name: z.string().trim().min(1, "Enter a step name."),
  // Position counting from the end: 1 = last step.
  rankFromEnd: z.coerce.number().int().min(1, "Number must be 1 or more."),
});
export type GlobalStepCreateInput = z.infer<typeof globalStepCreateInput>;

export const globalStepUpdateInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  rankFromEnd: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type GlobalStepUpdateInput = z.infer<typeof globalStepUpdateInput>;

export const globalStepDeleteInput = z.object({ id: z.string().min(1) });
export type GlobalStepDeleteInput = z.infer<typeof globalStepDeleteInput>;
