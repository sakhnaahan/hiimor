import assert from "node:assert/strict";
import test from "node:test";
import { HORSES } from "@/lib/constants";
import { isMainAdminUsername } from "@/lib/admin";
import { applyRaceBalance, calculateRaceOutcome } from "@/lib/game";
import { calculateMarketChance } from "@/lib/hkjc-odds";
import { canResetUserPassword, generateTemporaryPassword } from "@/lib/password-reset";
import {
  changePasswordSchema,
  coinAdjustmentSchema,
  passwordResetSchema,
  passwordSchema,
  raceSchema,
  rechargeSchema,
  roleChangeSchema,
  signupSchema,
} from "@/lib/validation";

test("signup validation creates username/password rules", () => {
  assert.equal(signupSchema.safeParse({ username: "player_1", password: "strongpass" }).success, true);
  assert.equal(signupSchema.safeParse({ username: "x", password: "strongpass" }).success, false);
  assert.equal(signupSchema.safeParse({ username: "bad name", password: "strongpass" }).success, false);
  assert.equal(signupSchema.safeParse({ username: "player_1", password: "short" }).success, false);
});

test("change password validation requires matching new passwords", () => {
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmNewPassword: "new-password",
    }).success,
    true,
  );
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmNewPassword: "different-password",
    }).success,
    false,
  );
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "same-password",
      newPassword: "same-password",
      confirmNewPassword: "same-password",
    }).success,
    false,
  );
});

test("coin mutation validation rejects invalid recharge and bet values", () => {
  assert.equal(rechargeSchema.safeParse({ userId: "1", amount: "100" }).success, true);
  assert.equal(rechargeSchema.safeParse({ userId: "1", amount: "-1" }).success, false);
  assert.equal(coinAdjustmentSchema.safeParse({ userId: "1", amount: "100" }).success, true);
  assert.equal(coinAdjustmentSchema.safeParse({ userId: "1", amount: "0" }).success, false);
  assert.equal(passwordResetSchema.safeParse({ userId: "1" }).success, true);
  assert.equal(passwordResetSchema.safeParse({ userId: "0" }).success, false);
  const validRaceBet = {
    selectedHorseNo: "1",
    raceDate: "2026/05/09",
    racecourseCode: "ST",
    raceNo: "1",
    quotedWinOdds: "4.8",
    betAmount: "50",
  };
  assert.equal(raceSchema.safeParse(validRaceBet).success, true);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, selectedHorseNo: "" }).success, false);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, racecourseCode: "S1" }).success, false);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, betAmount: "0" }).success, false);
  assert.equal(roleChangeSchema.safeParse({ userId: "1", role: "admin" }).success, true);
  assert.equal(roleChangeSchema.safeParse({ userId: "1", role: "owner" }).success, false);
});

test("race outcome pays multiplier snapshot only on win", () => {
  const win = calculateRaceOutcome(HORSES[0], 100, 2.5, 0);
  assert.deepEqual(win, {
    winningHorse: HORSES[0],
    isWin: true,
    payout: 250,
  });

  const loss = calculateRaceOutcome(HORSES[0], 100, 2.5, 0.99);
  assert.equal(loss.winningHorse, HORSES[HORSES.length - 1]);
  assert.equal(loss.isWin, false);
  assert.equal(loss.payout, 0);
});

test("race outcome can use HKJC runner names", () => {
  const runners = ["ALMIGHTY WARRIOR", "SHARP PLANET", "SHOW ME YOUR LOVE"];
  const result = calculateRaceOutcome("SHARP PLANET", 100, 3, 0.4, runners);

  assert.deepEqual(result, {
    winningHorse: "SHARP PLANET",
    isWin: true,
    payout: 300,
  });
});

test("race balance deducts stake and adds payout", () => {
  assert.deepEqual(applyRaceBalance(500, 100, 0), {
    balanceAfterBet: 400,
    finalBalance: 400,
  });
  assert.deepEqual(applyRaceBalance(500, 100, 200), {
    balanceAfterBet: 400,
    finalBalance: 600,
  });
});

test("market chance derives from decimal win odds", () => {
  assert.equal(calculateMarketChance("2.0"), 50);
  assert.equal(calculateMarketChance("5.5"), 18.2);
  assert.equal(calculateMarketChance("bad"), null);
});

test("main admin helper matches ADMIN_USERNAME", () => {
  const previous = process.env.ADMIN_USERNAME;
  process.env.ADMIN_USERNAME = "admin";

  assert.equal(isMainAdminUsername("admin"), true);
  assert.equal(isMainAdminUsername("player1"), false);

  process.env.ADMIN_USERNAME = previous;
});

test("password reset permissions block self reset and protect admins", () => {
  const actor = { id: 1, username: "admin" };
  const playerTarget = { id: 2, role: "player" };
  const adminTarget = { id: 3, role: "admin" };

  assert.equal(canResetUserPassword(actor, playerTarget, false), true);
  assert.equal(canResetUserPassword(actor, adminTarget, false), false);
  assert.equal(canResetUserPassword(actor, adminTarget, true), true);
  assert.equal(canResetUserPassword(actor, { id: 1, role: "admin" }, true), false);
});

test("temporary password satisfies password policy", () => {
  const temporaryPassword = generateTemporaryPassword();

  assert.equal(passwordSchema.safeParse(temporaryPassword).success, true);
  assert.match(temporaryPassword, /^Temp-/);
});
