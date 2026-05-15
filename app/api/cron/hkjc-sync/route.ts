import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { runHkjcSync } from "@/lib/hkjc-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-cron-secret") === secret;
}

async function handleCronSync(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  await ensureBootstrapData();
  const result = await runHkjcSync();
  return NextResponse.json({ ok: result.status !== "FAILED", ...result });
}

export async function GET(request: Request) {
  return handleCronSync(request);
}

export async function POST(request: Request) {
  return handleCronSync(request);
}
