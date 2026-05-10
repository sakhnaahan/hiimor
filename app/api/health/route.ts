import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureBootstrapData();
    const [users, pendingBets] = await Promise.all([
      prisma.user.count(),
      prisma.raceResult.count({ where: { result: "PENDING" } }),
    ]);

    return NextResponse.json({
      ok: true,
      database: "ready",
      users,
      pendingBets,
    });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
      },
      { status: 500 },
    );
  }
}
