import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrapData() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (username && password) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          username,
          passwordHash,
          role: "admin",
          status: "approved",
          coinBalance: 0,
        },
      });
    }
  }

  bootstrapped = true;
}

export async function ensureBootstrapData() {
  if (bootstrapped) {
    return;
  }

  bootstrapPromise ??= bootstrapData().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  await bootstrapPromise;
}
