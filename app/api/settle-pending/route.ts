import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { settlePendingHkjcBets } from "@/lib/hkjc-settlement";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await ensureBootstrapData();
  const result = await settlePendingHkjcBets({ userId: user.id });
  return NextResponse.json(result);
}
