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

type SessionPayload = AuthUser & {
  expiresAt: number;
};

function isAuthRole(value: unknown): value is AuthUser["role"] {
  return value === "player" || value === "admin";
}

function isAuthStatus(value: unknown): value is AuthUser["status"] {
  return value === "pending" || value === "approved" || value === "rejected";
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || "development-session-secret";
}

function signSessionPayload(payload: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function encodeSessionCookie(payload: SessionPayload) {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${signSessionPayload(data)}`;
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeSessionCookie(value: string): SessionPayload | null {
  const [data, signature] = value.split(".");
  if (!data || !signature || !signaturesMatch(signature, signSessionPayload(data))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (
      typeof payload.id !== "number" ||
      typeof payload.username !== "string" ||
      !isAuthRole(payload.role) ||
      !isAuthStatus(payload.status) ||
      typeof payload.coinBalance !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      status: payload.status,
      coinBalance: payload.coinBalance,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: number) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    encodeSessionCookie({
      id: user.id,
      username: user.username,
      role: toAuthRole(user.role),
      status: toAuthStatus(user.status),
      coinBalance: user.coinBalance,
      expiresAt: expiresAt.getTime(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    },
  );
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return null;
  }

  const payload = decodeSessionCookie(cookieValue);
  if (!payload) {
    return null;
  }

  await ensureBootstrapData();

  const user =
    (await prisma.user.findUnique({ where: { id: payload.id } })) ??
    (payload.role === "admin" ? await prisma.user.findUnique({ where: { username: payload.username } }) : null);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: toAuthRole(user.role),
    status: toAuthStatus(user.status),
    coinBalance: user.coinBalance,
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
