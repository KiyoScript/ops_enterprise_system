import type { Prisma } from "@/generated/prisma/client";

// Opaque transaction handle passed between repositories so a service can
// compose multi-repository writes atomically without importing Prisma itself.
export type DbTx = Prisma.TransactionClient;
