import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { SESSION_COOKIE_NAME, SESSION_DAYS } from "@/lib/constants";

export type AuthUser = {
  id: number;
  username: string;
  role: "player" | "admin";
  status: "pending" | "approved" | "rejected";
  coinBalance: number;
};

function toAuthRole(value: string): AuthUser["role"] {
  return value === "admin" ? "admin" : "player";
}

function toAuthStatus(value: string): AuthUser["status"] {
  if (value === "approved" || value === "rejected") {
    return value;
  }
  return "pending";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await ensureBootstrapData();
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  await ensureBootstrapData();

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    }
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    role: toAuthRole(session.user.role),
    status: toAuthStatus(session.user.status),
    coinBalance: session.user.coinBalance,
  };
}

export async function requireApprovedUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireApprovedUser();
  if (user.role !== "admin") {
    redirect("/race");
  }
  return user;
}
