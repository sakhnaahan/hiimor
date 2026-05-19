import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRunnerAssignedWeight,
  formatRunnerHorseWeight,
  formatRunnerLast6Runs,
  formatRunnerSex,
} from "@/lib/format";

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

test("horse body weight converts to rounded kilograms in both languages", () => {
  assert.equal(formatRunnerHorseWeight("1120", "en"), "508kg");
  assert.equal(formatRunnerHorseWeight("1120", "mn"), "508кг");
});

test("horse body weight preserves empty and non-numeric values", () => {
  assert.equal(formatRunnerHorseWeight("", "en"), "");
  assert.equal(formatRunnerHorseWeight("N/A", "mn"), "N/A");
});

test("runner sex maps HKJC codes to simple labels", () => {
  assert.equal(formatRunnerSex("g", "en"), "Male");
  assert.equal(formatRunnerSex("f", "en"), "Female");
  assert.equal(formatRunnerSex("m", "mn"), "Эм");
  assert.equal(formatRunnerSex("r", "mn"), "Эр");
  assert.equal(formatRunnerSex("", "en"), "");
  assert.equal(formatRunnerSex("x", "en"), "");
});

test("last 6 runs preserve HKJC order and highlight placings 1 to 3", () => {
  assert.deepEqual(formatRunnerLast6Runs("4/8/5/3/10/11"), [
    { value: "4", isHighlighted: false },
    { value: "8", isHighlighted: false },
    { value: "5", isHighlighted: false },
    { value: "3", isHighlighted: true },
    { value: "10", isHighlighted: false },
    { value: "11", isHighlighted: false },
  ]);
  assert.deepEqual(formatRunnerLast6Runs("3/2/1"), [
    { value: "3", isHighlighted: true },
    { value: "2", isHighlighted: true },
    { value: "1", isHighlighted: true },
  ]);
});

test("last 6 runs ignore empty segments and preserve non-place values", () => {
  assert.deepEqual(formatRunnerLast6Runs(" /4//x/0 "), [
    { value: "4", isHighlighted: false },
    { value: "x", isHighlighted: false },
    { value: "0", isHighlighted: false },
  ]);
  assert.deepEqual(formatRunnerLast6Runs(""), []);
});
