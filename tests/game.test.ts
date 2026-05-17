import assert from "node:assert/strict";
import test from "node:test";
import { HORSES } from "@/lib/constants";
import { isMainAdminUsername } from "@/lib/admin";
import { applyRaceBalance, calculateRaceOutcome } from "@/lib/game";
import {
  calculateMarketChance,
  getHkjcQuinellaOdds,
  parseHkjcQuinellaOddsResponse,
  parseHkjcRunnerOddsResponse,
} from "@/lib/hkjc-odds";
import { canResetUserPassword, generateTemporaryPassword } from "@/lib/password-reset";
import {
  changePasswordSchema,
  coinAdjustmentSchema,
  passwordResetSchema,
  passwordSchema,
  raceBasketSchema,
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
    betType: "WIN",
    raceDate: "2026/05/09",
    racecourseCode: "ST",
    raceNo: "1",
    quotedWinOdds: "4.8",
    quotedPlaceOdds: "1.8",
    betAmount: "100",
  };
  assert.equal(raceSchema.safeParse(validRaceBet).success, true);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, betType: "PLACE", quotedWinOdds: "" }).success, true);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, betType: "WIN_PLACE" }).success, true);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, betType: "WIN_PLACE", quotedPlaceOdds: "" }).success, false);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, selectedHorseNo: "" }).success, false);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, racecourseCode: "S1" }).success, false);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, betAmount: "99" }).success, false);
  assert.equal(raceSchema.safeParse({ ...validRaceBet, betAmount: "0" }).success, false);
  const validBasketBet = {
    raceDate: "2026/05/09",
    racecourseCode: "ST",
    raceNo: "1",
    basketItems: JSON.stringify([
      {
        selectedHorseNo: "1",
        betType: "WIN",
        quotedWinOdds: "4.8",
        quotedPlaceOdds: "",
        unitBetAmount: "100",
      },
      {
        selectedHorseNo: "2",
        betType: "WIN_PLACE",
        quotedWinOdds: "6.2",
        quotedPlaceOdds: "1.9",
        unitBetAmount: "100",
      },
    ]),
  };
  assert.equal(raceBasketSchema.safeParse(validBasketBet).success, true);
  assert.equal(
    raceBasketSchema.safeParse({
      ...validBasketBet,
      basketItems: JSON.stringify([
        {
          selectedHorseNo: "5",
          selectedLegHorseNos: ["8", "9"],
          betType: "QUINELLA",
          quotedWinOdds: "",
          quotedPlaceOdds: "",
          quotedQuinellaOdds: {
            "8": "16",
            "9": "18",
          },
          unitBetAmount: "100",
        },
        {
          selectedHorseNo: "1",
          selectedPlaceHorseNo: "2",
          betType: "WIN_PLACE_COMBO",
          quotedWinOdds: "4.8",
          quotedPlaceOdds: "1.9",
          unitBetAmount: "100",
        },
      ]),
    }).success,
    true,
  );
  assert.equal(
    raceBasketSchema.safeParse({
      ...validBasketBet,
      basketItems: JSON.stringify([
        {
          selectedHorseNo: "5",
          selectedLegHorseNos: ["5"],
          betType: "QUINELLA",
          quotedQuinellaOdds: {
            "5": "16",
          },
          unitBetAmount: "100",
        },
      ]),
    }).success,
    false,
  );
  assert.equal(
    raceBasketSchema.safeParse({
      ...validBasketBet,
      basketItems: JSON.stringify([
        {
          selectedHorseNo: "1",
          selectedPlaceHorseNo: "1",
          betType: "WIN_PLACE_COMBO",
          quotedWinOdds: "4.8",
          quotedPlaceOdds: "1.9",
          unitBetAmount: "100",
        },
      ]),
    }).success,
    false,
  );
  assert.equal(
    raceBasketSchema.safeParse({
      ...validBasketBet,
      basketItems: JSON.stringify([
        {
          selectedHorseNo: "2",
          betType: "WIN_PLACE",
          quotedWinOdds: "6.2",
          quotedPlaceOdds: "",
          unitBetAmount: "100",
        },
      ]),
    }).success,
    false,
  );
  assert.equal(
    raceBasketSchema.safeParse({
      ...validBasketBet,
      basketItems: JSON.stringify([
        {
          selectedHorseNo: "1",
          betType: "WIN",
          quotedWinOdds: "4.8",
          quotedPlaceOdds: "",
          unitBetAmount: "100",
        },
        {
          selectedHorseNo: "1",
          betType: "WIN",
          quotedWinOdds: "4.8",
          quotedPlaceOdds: "",
          unitBetAmount: "100",
        },
      ]),
    }).success,
    false,
  );
  assert.equal(raceBasketSchema.safeParse({ ...validBasketBet, basketItems: "not-json" }).success, false);
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

test("HKJC odds parser combines win and place pool odds by runner", () => {
  const odds = parseHkjcRunnerOddsResponse({
    data: {
      raceMeetings: [
        {
          pmPools: [
            {
              oddsType: "WIN",
              status: "START_SELL",
              sellStatus: "START_SELL",
              lastUpdateTime: "10:00",
              oddsNodes: [{ combString: "01", oddsValue: "4.8", hotFavourite: true }],
            },
            {
              oddsType: "PLA",
              status: "START_SELL",
              sellStatus: "START_SELL",
              lastUpdateTime: "10:01",
              oddsNodes: [{ combString: "1", oddsValue: "1.7", hotFavourite: false }],
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(odds[0], {
    horseNo: "1",
    winOdds: "4.8",
    marketChance: 20.8,
    hotFavourite: true,
    poolStatus: "START_SELL",
    sellStatus: "START_SELL",
    lastUpdateTime: "10:00",
    placeOdds: "1.7",
    placeMarketChance: 58.8,
    placePoolStatus: "START_SELL",
    placeSellStatus: "START_SELL",
    placeLastUpdateTime: "10:01",
  });
});

test("HKJC Quinella odds parser normalizes pair combinations", () => {
  const odds = parseHkjcQuinellaOddsResponse({
    data: {
      raceMeetings: [
        {
          pmPools: [
            {
              oddsType: "QIN",
              status: "START_SELL",
              sellStatus: "START_SELL",
              lastUpdateTime: "10:02",
              oddsNodes: [{ combString: "08-05", oddsValue: "16", hotFavourite: false }],
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(odds[0], {
    horseNoA: "5",
    horseNoB: "8",
    odds: "16",
    poolStatus: "START_SELL",
    sellStatus: "START_SELL",
    lastUpdateTime: "10:02",
    inferred: false,
  });
});

test("HKJC Quinella odds fetch returns empty data when official QIN is blocked", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("blocked");
  }) as typeof fetch;

  try {
    const odds = await getHkjcQuinellaOdds({
      raceDate: "2026/05/09",
      racecourseCode: "ST",
      raceNo: 1,
    });

    assert.deepEqual(odds, []);
  } finally {
    globalThis.fetch = previousFetch;
  }
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
