import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedHkjcHealth } from "@/app/api/health/hkjc/route";

test("HKJC health route accepts cron secret headers only", () => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";

  try {
    assert.equal(
      isAuthorizedHkjcHealth(
        new Request("https://example.test/api/health/hkjc", {
          headers: { authorization: "Bearer test-secret" },
        }),
      ),
      true,
    );
    assert.equal(
      isAuthorizedHkjcHealth(
        new Request("https://example.test/api/health/hkjc", {
          headers: { "x-cron-secret": "test-secret" },
        }),
      ),
      true,
    );
    assert.equal(
      isAuthorizedHkjcHealth(
        new Request("https://example.test/api/health/hkjc", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
      ),
      false,
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
  }
});
