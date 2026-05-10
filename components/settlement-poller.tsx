"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SettlementPoller({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let running = false;

    async function settle() {
      if (running) {
        return;
      }

      running = true;
      try {
        const response = await fetch("/api/settle-pending", {
          method: "POST",
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as { settled?: number };
        if (!cancelled && result.settled && result.settled > 0) {
          router.refresh();
        }
      } finally {
        running = false;
      }
    }

    void settle();
    const interval = window.setInterval(() => void settle(), 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, router]);

  return null;
}
