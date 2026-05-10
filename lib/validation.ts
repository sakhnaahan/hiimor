import { z } from "zod";

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
  raceDate: z.string().trim().min(1, "Race date is required.").max(20),
  racecourseCode: z.string().trim().min(1, "Racecourse is required.").max(10),
  raceNo: z.coerce.number().int().positive().max(99),
  quotedWinOdds: z.string().trim().min(1, "Odds are unavailable. Try again shortly.").max(20),
  betAmount: z.coerce.number().int().positive().max(1_000_000),
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
