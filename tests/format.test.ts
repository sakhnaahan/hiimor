import assert from "node:assert/strict";
import test from "node:test";
import { formatRunnerAssignedWeight } from "@/lib/format";

test("mongolian assigned weight display converts pounds to whole kilograms", () => {
  assert.equal(formatRunnerAssignedWeight("135", "mn"), "61кг");
});

test("assigned weight display keeps english values in pounds", () => {
  assert.equal(formatRunnerAssignedWeight("135", "en"), "135");
});

test("assigned weight display preserves empty and non-numeric values", () => {
  assert.equal(formatRunnerAssignedWeight("", "mn"), "");
  assert.equal(formatRunnerAssignedWeight("N/A", "mn"), "N/A");
});
