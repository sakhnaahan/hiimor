"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, requireAdmin, requireApprovedUser } from "@/lib/auth";
import { ensureBootstrapData } from "@/lib/bootstrap";
import {
  changePasswordSchema,
  coinAdjustmentSchema,
  loginSchema,
  passwordResetSchema,
  raceSchema,
  rechargeSchema,
  roleChangeSchema,
  signupSchema,
  userIdSchema,
} from "@/lib/validation";
import { getHkjcUpcomingRaceCard, isLocalMainRaceCard } from "@/lib/hkjc-racecard";
import { validateLockedWinOddsQuote } from "@/lib/race-betting-ui";
import { isMainAdminUsername } from "@/lib/admin";
import { canResetUserPassword, generateTemporaryPassword } from "@/lib/password-reset";
import { getCurrentLanguage } from "@/lib/language";
import { translateServerMessage } from "@/lib/i18n";
import { calculateRaceOutcome } from "@/lib/game";

export type ActionState = {
  ok?: boolean;
  message?: string;
};

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function localizedMessage(message: string) {
  return translateServerMessage(await getCurrentLanguage(), message);
}

async function localizedIssueMessage(message: string | undefined, fallback: string) {
  return localizedMessage(message ?? fallback);
}

async function ensureDatabaseReady(): Promise<ActionState | null> {
  try {
    await ensureBootstrapData();
    return null;
  } catch (error) {
    console.error("Database bootstrap failed", error);
    return { message: await localizedMessage("Database is not available. Check Vercel DATABASE_URL and storage setup.") };
  }
}

export async function signupAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const databaseError = await ensureDatabaseReady();
  if (databaseError) {
    return databaseError;
  }

  const parsed = signupSchema.safeParse({
    username: formValue(formData, "username"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid signup details.") };
  }

  const username = parsed.data.username;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { message: await localizedMessage("That username is already taken.") };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: "player",
      status: "pending",
      coinBalance: 0,
    },
  });

  return { ok: true, message: await localizedMessage("Signup request sent. Wait for admin approval before logging in.") };
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const databaseError = await ensureDatabaseReady();
  if (databaseError) {
    return databaseError;
  }

  const parsed = loginSchema.safeParse({
    username: formValue(formData, "username"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid login details.") };
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user) {
    return { message: await localizedMessage("Invalid username or password.") };
  }

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    return { message: await localizedMessage("Invalid username or password.") };
  }

  if (user.status !== "approved") {
    const language = await getCurrentLanguage();
    return {
      message:
        language === "mn"
          ? `Таны дансны төлөв ${user.status}. Нэвтрэхийн өмнө админ батлах шаардлагатай.`
          : `Your account is ${user.status}. Admin approval is required before login.`,
    };
  }

  await createSession(user.id);
  redirect(user.role === "admin" ? "/admin" : "/race");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireApprovedUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formValue(formData, "currentPassword"),
    newPassword: formValue(formData, "newPassword"),
    confirmNewPassword: formValue(formData, "confirmNewPassword"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid password details.") };
  }

  const account = await prisma.user.findUnique({ where: { id: user.id } });
  if (!account) {
    return { message: await localizedMessage("Account was not found.") };
  }

  const currentPasswordOk = await bcrypt.compare(parsed.data.currentPassword, account.passwordHash);
  if (!currentPasswordOk) {
    return { message: await localizedMessage("Current password is incorrect.") };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  await createSession(user.id);

  revalidatePath("/account");
  return { ok: true, message: await localizedMessage("Password changed. Other sessions were signed out.") };
}

export async function approveUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target || target.status === "approved") {
      return;
    }

    await tx.user.update({
      where: { id: target.id },
      data: { status: "approved" },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        actionType: "USER_APPROVED",
        targetUserId: target.id,
        oldValue: target.status,
        newValue: "approved",
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function rejectUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target || target.role === "admin") {
      return;
    }

    await tx.user.update({
      where: { id: target.id },
      data: { status: "rejected" },
    });
    await tx.session.deleteMany({ where: { userId: target.id } });
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        actionType: "USER_REJECTED",
        targetUserId: target.id,
        oldValue: target.status,
        newValue: "rejected",
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function promoteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!isMainAdminUsername(admin.username)) {
    return;
  }

  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target || target.status !== "approved" || target.role === "admin") {
      return;
    }

    await tx.user.update({ where: { id: target.id }, data: { role: "admin" } });
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        actionType: "PROMOTED_TO_ADMIN",
        targetUserId: target.id,
        oldValue: target.role,
        newValue: "admin",
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function updateUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!isMainAdminUsername(admin.username)) {
    return;
  }

  const parsed = roleChangeSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target || target.status !== "approved") {
      return;
    }

    if (isMainAdminUsername(target.username)) {
      return;
    }

    if (target.role === parsed.data.role) {
      return;
    }

    await tx.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        actionType: "USER_ROLE_CHANGED",
        targetUserId: target.id,
        oldValue: target.role,
        newValue: parsed.data.role,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = passwordResetSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid user.") };
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) {
    return { message: await localizedMessage("User was not found.") };
  }

  const adminIsMainAdmin = isMainAdminUsername(admin.username);
  if (!canResetUserPassword(admin, target, adminIsMainAdmin)) {
    return { message: await localizedMessage("You cannot reset this user's password.") };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: target.id } });
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        actionType: "PASSWORD_RESET",
        targetUserId: target.id,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  const language = await getCurrentLanguage();
  return {
    ok: true,
    message:
      language === "mn"
        ? `${target.username} хэрэглэгчийн түр нууц үг: ${temporaryPassword}`
        : `Temporary password for ${target.username}: ${temporaryPassword}`,
  };
}

export async function rechargeUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = rechargeSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid recharge amount.") };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
      if (!target || target.status !== "approved") {
        throw new Error(await localizedMessage("Only approved users can be recharged."));
      }

      const balanceBefore = target.coinBalance;
      const balanceAfter = balanceBefore + parsed.data.amount;

      await tx.user.update({
        where: { id: target.id },
        data: { coinBalance: balanceAfter },
      });
      await tx.coinTransaction.create({
        data: {
          userId: target.id,
          type: "RECHARGE",
          amount: parsed.data.amount,
          balanceBefore,
          balanceAfter,
          adminId: admin.id,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminId: admin.id,
          actionType: "COIN_RECHARGE",
          targetUserId: target.id,
          oldValue: String(balanceBefore),
          newValue: String(balanceAfter),
        },
      });
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : await localizedMessage("Recharge failed.") };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/transactions");
  return { ok: true, message: await localizedMessage("Coins recharged.") };
}

export async function subtractUserCoinsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = coinAdjustmentSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid subtract amount.") };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: parsed.data.userId } });
      if (!target || target.status !== "approved") {
        throw new Error(await localizedMessage("Only approved users can have coins subtracted."));
      }

      if (target.coinBalance < parsed.data.amount) {
        throw new Error(await localizedMessage("Cannot subtract more coins than the user has."));
      }

      const balanceBefore = target.coinBalance;
      const balanceAfter = balanceBefore - parsed.data.amount;

      await tx.user.update({
        where: { id: target.id },
        data: { coinBalance: balanceAfter },
      });
      await tx.coinTransaction.create({
        data: {
          userId: target.id,
          type: "ADMIN_SUBTRACT",
          amount: -parsed.data.amount,
          balanceBefore,
          balanceAfter,
          adminId: admin.id,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminId: admin.id,
          actionType: "COIN_SUBTRACT",
          targetUserId: target.id,
          oldValue: String(balanceBefore),
          newValue: String(balanceAfter),
        },
      });
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : await localizedMessage("Coin subtraction failed.") };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/transactions");
  revalidatePath("/race");
  revalidatePath("/history");
  return { ok: true, message: await localizedMessage("Coins subtracted.") };
}

export async function runRaceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireApprovedUser();
  const parsed = raceSchema.safeParse({
    selectedHorseNo: formData.get("selectedHorseNo"),
    raceDate: formData.get("raceDate"),
    racecourseCode: formData.get("racecourseCode"),
    raceNo: formData.get("raceNo"),
    quotedWinOdds: formData.get("quotedWinOdds"),
    betAmount: formData.get("betAmount"),
  });

  if (!parsed.success) {
    return { message: await localizedIssueMessage(parsed.error.issues[0]?.message, "Invalid race bet.") };
  }

  const hkjcRaceCard = await getHkjcUpcomingRaceCard({
    raceDate: parsed.data.raceDate,
    racecourse: parsed.data.racecourseCode,
    raceNo: parsed.data.raceNo,
  });

  if (!hkjcRaceCard.ok) {
    return { message: await localizedMessage("HKJC racecard is unavailable. Try again shortly.") };
  }

  if (
    hkjcRaceCard.raceCard.raceNo !== parsed.data.raceNo ||
    hkjcRaceCard.raceCard.raceDate !== parsed.data.raceDate ||
    hkjcRaceCard.raceCard.racecourseCode !== parsed.data.racecourseCode
  ) {
    return { message: await localizedMessage("Selected race is no longer available in the current HKJC racecard.") };
  }

  if (!hkjcRaceCard.raceCard.raceDate || !hkjcRaceCard.raceCard.racecourseCode) {
    return { message: await localizedMessage("HKJC race identity is unavailable. Try again shortly.") };
  }

  const selectedRunner = hkjcRaceCard.raceCard.runners.find(
    (runner) => runner.horseNo === parsed.data.selectedHorseNo,
  );
  if (!selectedRunner) {
    return { message: await localizedMessage("Selected horse is no longer available in the current HKJC racecard.") };
  }

  const oddsValidation = validateLockedWinOddsQuote({
    quotedWinOdds: parsed.data.quotedWinOdds,
    currentWinOdds: selectedRunner.winOdds,
    oddsAvailable: selectedRunner.oddsAvailable,
  });
  if (!oddsValidation.ok && oddsValidation.reason === "unavailable") {
    return { message: await localizedMessage("Odds are unavailable. Try again shortly.") };
  }

  if (!oddsValidation.ok) {
    return { message: await localizedMessage("Odds changed. Please confirm again.") };
  }

  const localOutcome = isLocalMainRaceCard(hkjcRaceCard.raceCard)
    ? calculateRaceOutcome(
        selectedRunner.name,
        parsed.data.betAmount,
        oddsValidation.lockedWinOdds,
        Math.random(),
        hkjcRaceCard.raceCard.runners.map((runner) => runner.name),
      )
    : null;
  const localWinningRunner = localOutcome
    ? hkjcRaceCard.raceCard.runners.find((runner) => runner.name === localOutcome.winningHorse)
    : null;
  let raceId: number | null = null;

  try {
    raceId = await prisma.$transaction(async (tx) => {
      const player = await tx.user.findUnique({ where: { id: user.id } });
      if (!player || player.status !== "approved") {
        throw new Error(await localizedMessage("Approved account required."));
      }

      const deduction = await tx.user.updateMany({
        where: {
          id: player.id,
          status: "approved",
          coinBalance: { gte: parsed.data.betAmount },
        },
        data: {
          coinBalance: { decrement: parsed.data.betAmount },
        },
      });

      if (deduction.count !== 1) {
        throw new Error(await localizedMessage("Insufficient coin balance."));
      }

      const balanceBefore = player.coinBalance;
      const balanceAfterBet = balanceBefore - parsed.data.betAmount;

      const race = await tx.raceResult.create({
        data: {
          userId: player.id,
          selectedHorse: selectedRunner.name,
          selectedHorseNo: selectedRunner.horseNo,
          winningHorse: localOutcome?.winningHorse ?? "",
          winningHorseNo: localWinningRunner?.horseNo,
          betAmount: parsed.data.betAmount,
          multiplierUsed: oddsValidation.lockedWinOdds,
          payout: localOutcome?.payout ?? 0,
          result: localOutcome ? (localOutcome.isWin ? "WIN" : "LOSS") : "PENDING",
          hkjcRaceDate: hkjcRaceCard.raceCard.raceDate,
          hkjcRacecourseCode: hkjcRaceCard.raceCard.racecourseCode,
          hkjcRacecourseName: hkjcRaceCard.raceCard.racecourse,
          hkjcRaceNo: hkjcRaceCard.raceCard.raceNo,
          hkjcRaceName: hkjcRaceCard.raceCard.raceName,
          hkjcRaceStartTime: hkjcRaceCard.raceCard.startTime,
          settledAt: localOutcome ? new Date() : null,
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId: player.id,
          type: "BET_PLACED",
          amount: -parsed.data.betAmount,
          balanceBefore,
          balanceAfter: balanceAfterBet,
          relatedRaceId: race.id,
        },
      });

      if (localOutcome) {
        if (localOutcome.isWin) {
          await tx.user.update({
            where: { id: player.id },
            data: { coinBalance: { increment: localOutcome.payout } },
          });
          await tx.coinTransaction.create({
            data: {
              userId: player.id,
              type: "RACE_WIN",
              amount: localOutcome.payout,
              balanceBefore: balanceAfterBet,
              balanceAfter: balanceAfterBet + localOutcome.payout,
              relatedRaceId: race.id,
            },
          });
        } else {
          await tx.coinTransaction.create({
            data: {
              userId: player.id,
              type: "RACE_LOSS",
              amount: 0,
              balanceBefore: balanceAfterBet,
              balanceAfter: balanceAfterBet,
              relatedRaceId: race.id,
            },
          });
        }
      }

      return race.id;
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : await localizedMessage("Race failed.") };
  }

  revalidatePath("/race");
  revalidatePath("/race");
  revalidatePath("/history");
  const language = await getCurrentLanguage();
  if (localOutcome) {
    return {
      ok: true,
      message: localOutcome.isWin
        ? `Race #${raceId} settled. ${selectedRunner.name} won ${localOutcome.payout} coins.`
        : `Race #${raceId} settled. Winner: ${localOutcome.winningHorse}.`,
    };
  }

  return {
    ok: true,
    message:
      language === "mn"
        ? `${selectedRunner.name} дээр бооцоо тавигдлаа. Уралдаан #${raceId} HKJC албан ёсны дүн хүлээж байна.`
        : `Bet placed on ${selectedRunner.name}. Race #${raceId} is pending the official HKJC result.`,
  };
}
