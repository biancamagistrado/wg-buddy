import { PrismaClient } from "@prisma/client";

/**
 * One shared database client for the whole API.
 *
 * It is cached on `globalThis` so that `tsx watch` restarting the server during
 * development does not open a new connection pool every time a file is saved.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
