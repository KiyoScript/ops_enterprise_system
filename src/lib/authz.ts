import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { Role } from "@/generated/prisma/enums";

// The authenticated user a Server Action / Route Handler hands to services.
// Services re-check roles themselves (authorization lives in the service
// layer, not just the UI).
export type Actor = { id: string; role: Role };

export async function requireActor(): Promise<Actor> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  return { id: session.user.id, role: session.user.role };
}

export function assertRole(actor: Actor, allowed: readonly Role[]): void {
  if (!allowed.includes(actor.role)) throw new ForbiddenError();
}
