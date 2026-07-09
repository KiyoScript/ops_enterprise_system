import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import type { Role } from "@/generated/prisma/enums";

// The authenticated user a Server Action / Route Handler hands to services.
// Services enforce permissions themselves via assertCan() (see lib/ability.ts
// — the CASL layer that unifies the per-system roles of the legacy apps).
export type Actor = { id: string; role: Role };

export async function requireActor(): Promise<Actor> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  return { id: session.user.id, role: session.user.role };
}
