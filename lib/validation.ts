import { z } from "zod";
import { isMainHkjcRacecourse } from "@/lib/hkjc-racecard";
import { MIN_BET_AMOUNT } from "@/lib/rules";

const raceSingleBetTypeSchema = z.enum(["WIN", "PLACE", "WIN_PLACE"]);
const raceBetTypeSchema = z.enum(["WIN", "PLACE", "WIN_PLACE", "WIN_PLACE_COMBO", "QUINELLA"]);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be at most 32 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, and underscores.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = signupSchema;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        message: "New passwords do not match.",
        path: ["confirmNewPassword"],
      });
    }

    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        message: "New password must be different from the current password.",
        path: ["newPassword"],
      });
    }
  });

export const raceSchema = z.object({
  selectedHorseNo: z.string().trim().min(1, "Choose a horse.").max(10, "Horse number is too long."),
  betType: raceSingleBetTypeSchema.default("WIN"),
  raceDate: z.string().trim().min(1, "Race date is required.").max(20),
  racecourseCode: z
    .string()
    .trim()
    .min(1, "Racecourse is required.")
    .max(10)
    .refine(isMainHkjcRacecourse, "Only Sha Tin and Happy Valley races are available."),
  raceNo: z.coerce.number().int().positive().max(99),
  quotedWinOdds: z.string().trim().max(20).optional().default(""),
  quotedPlaceOdds: z.string().trim().max(20).optional().default(""),
  betAmount: z.coerce.number().int().min(MIN_BET_AMOUNT, `Minimum bet is ${MIN_BET_AMOUNT} coins.`).max(1_000_000),
}).superRefine((value, context) => {
  if ((value.betType === "WIN" || value.betType === "WIN_PLACE") && !value.quotedWinOdds) {
    context.addIssue({
      code: "custom",
      message: "Odds are unavailable. Try again shortly.",
      path: ["quotedWinOdds"],
    });
  }

  if ((value.betType === "PLACE" || value.betType === "WIN_PLACE") && !value.quotedPlaceOdds) {
    context.addIssue({
      code: "custom",
      message: "Odds are unavailable. Try again shortly.",
      path: ["quotedPlaceOdds"],
    });
  }
});

const raceBasketItemSchema = z.object({
  selectedHorseNo: z.string().trim().min(1, "Choose a horse.").max(10, "Horse number is too long."),
  selectedPlaceHorseNo: z.string().trim().max(10, "Horse number is too long.").optional().default(""),
  selectedLegHorseNos: z.array(z.string().trim().min(1).max(10)).max(5).optional().default([]),
  betType: raceBetTypeSchema,
  quotedWinOdds: z.string().trim().max(20).optional().default(""),
  quotedPlaceOdds: z.string().trim().max(20).optional().default(""),
  quotedQuinellaOdds: z.record(z.string(), z.string().trim().max(20)).optional().default({}),
  unitBetAmount: z.coerce.number().int().min(MIN_BET_AMOUNT, `Minimum bet is ${MIN_BET_AMOUNT} coins.`).max(1_000_000),
}).superRefine((value, context) => {
  if ((value.betType === "WIN" || value.betType === "WIN_PLACE") && !value.quotedWinOdds) {
    context.addIssue({
      code: "custom",
      message: "Odds are unavailable. Try again shortly.",
      path: ["quotedWinOdds"],
    });
  }

  if ((value.betType === "PLACE" || value.betType === "WIN_PLACE") && !value.quotedPlaceOdds) {
    context.addIssue({
      code: "custom",
      message: "Odds are unavailable. Try again shortly.",
      path: ["quotedPlaceOdds"],
    });
  }

  if (value.betType === "WIN_PLACE_COMBO") {
    if (!value.selectedPlaceHorseNo) {
      context.addIssue({
        code: "custom",
        message: "Choose a place horse.",
        path: ["selectedPlaceHorseNo"],
      });
    }

    if (value.selectedPlaceHorseNo && value.selectedPlaceHorseNo === value.selectedHorseNo) {
      context.addIssue({
        code: "custom",
        message: "Choose two different horses.",
        path: ["selectedPlaceHorseNo"],
      });
    }

    if (!value.quotedWinOdds || !value.quotedPlaceOdds) {
      context.addIssue({
        code: "custom",
        message: "Odds are unavailable. Try again shortly.",
        path: ["quotedWinOdds"],
      });
    }
  }

  if (value.betType === "QUINELLA") {
    if (value.selectedLegHorseNos.length < 1) {
      context.addIssue({
        code: "custom",
        message: "Choose at least one leg horse.",
        path: ["selectedLegHorseNos"],
      });
    }

    const uniqueLegHorseNos = new Set(value.selectedLegHorseNos);
    if (uniqueLegHorseNos.size !== value.selectedLegHorseNos.length) {
      context.addIssue({
        code: "custom",
        message: "Choose unique leg horses.",
        path: ["selectedLegHorseNos"],
      });
    }

    if (value.selectedLegHorseNos.includes(value.selectedHorseNo)) {
      context.addIssue({
        code: "custom",
        message: "Banker cannot also be a leg horse.",
        path: ["selectedLegHorseNos"],
      });
    }

    for (const legHorseNo of value.selectedLegHorseNos) {
      if (!value.quotedQuinellaOdds[legHorseNo]) {
        context.addIssue({
          code: "custom",
          message: "Odds are unavailable. Try again shortly.",
          path: ["quotedQuinellaOdds", legHorseNo],
        });
      }
    }
  }
});

function parseBasketItems(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const raceBasketSchema = z.object({
  raceDate: z.string().trim().min(1, "Race date is required.").max(20),
  racecourseCode: z
    .string()
    .trim()
    .min(1, "Racecourse is required.")
    .max(10)
    .refine(isMainHkjcRacecourse, "Only Sha Tin and Happy Valley races are available."),
  raceNo: z.coerce.number().int().positive().max(99),
  basketItems: z.preprocess(parseBasketItems, z.array(raceBasketItemSchema).min(1, "Choose a horse.").max(40)),
}).superRefine((value, context) => {
  const keys = new Set<string>();

  value.basketItems.forEach((item, index) => {
    const key =
      item.betType === "QUINELLA"
        ? `${item.selectedHorseNo}:${item.betType}:${[...item.selectedLegHorseNos].sort().join("|")}`
        : `${item.selectedHorseNo}:${item.betType}:${item.selectedPlaceHorseNo}`;
    if (keys.has(key)) {
      context.addIssue({
        code: "custom",
        message: "Invalid race bet.",
        path: ["basketItems", index],
      });
      return;
    }

    keys.add(key);
  });
});

export const rechargeSchema = z.object({
  userId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive().max(1_000_000),
});

export const coinAdjustmentSchema = rechargeSchema;

export const userIdSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const passwordResetSchema = userIdSchema;

export const roleChangeSchema = z.object({
  userId: z.coerce.number().int().positive(),
  role: z.enum(["player", "admin"]),
});
