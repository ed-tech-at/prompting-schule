import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// ...existing code...
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV === 'debug') {
  globalForPrisma.prisma = prisma;
}
