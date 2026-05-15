import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasSnapshotDelegates(client: PrismaClient | undefined) {
  const prismaWithDelegates = client as PrismaClient & {
    hkjcMeetingSnapshot?: unknown;
    hkjcRaceSnapshot?: unknown;
    hkjcSyncRun?: unknown;
  };

  return Boolean(
    prismaWithDelegates?.hkjcMeetingSnapshot &&
      prismaWithDelegates?.hkjcRaceSnapshot &&
      prismaWithDelegates?.hkjcSyncRun,
  );
}

export const prisma =
  globalForPrisma.prisma && hasSnapshotDelegates(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
