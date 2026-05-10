import { prisma } from "@/lib/prisma";
import { getHkjcRaceResult } from "@/lib/hkjc-results";

type SettlementOptions = {
  userId?: number;
};

type PendingRace = {
  id: number;
  userId: number;
  selectedHorseNo: string | null;
  betAmount: number;
  multiplierUsed: number;
  hkjcRaceDate: string | null;
  hkjcRacecourseCode: string | null;
  hkjcRaceNo: number | null;
  hkjcRaceStartTime: string | null;
};

function raceHasHkjcIdentity(race: PendingRace) {
  return Boolean(
    race.selectedHorseNo &&
      race.hkjcRaceDate &&
      race.hkjcRacecourseCode &&
      race.hkjcRaceNo &&
      race.hkjcRaceStartTime,
  );
}

function canCheckOfficialResult(race: PendingRace) {
  if (!race.hkjcRaceDate || !race.hkjcRaceStartTime) {
    return false;
  }

  const raceTime = new Date(`${race.hkjcRaceDate.replaceAll("/", "-")}T${race.hkjcRaceStartTime}:00+08:00`);
  return Number.isFinite(raceTime.getTime()) && Date.now() >= raceTime.getTime();
}

export async function settlePendingHkjcBets(options: SettlementOptions = {}) {
  const pendingRaces = await prisma.raceResult.findMany({
    where: {
      result: "PENDING",
      ...(options.userId ? { userId: options.userId } : {}),
    },
    select: {
      id: true,
      userId: true,
      selectedHorseNo: true,
      betAmount: true,
      multiplierUsed: true,
      hkjcRaceDate: true,
      hkjcRacecourseCode: true,
      hkjcRaceNo: true,
      hkjcRaceStartTime: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  let settled = 0;
  const resultCache = new Map<string, Awaited<ReturnType<typeof getHkjcRaceResult>>>();

  for (const race of pendingRaces) {
    if (!raceHasHkjcIdentity(race) || !canCheckOfficialResult(race)) {
      continue;
    }

    const cacheKey = `${race.hkjcRaceDate}|${race.hkjcRacecourseCode}|${race.hkjcRaceNo}`;
    if (!resultCache.has(cacheKey)) {
      resultCache.set(
        cacheKey,
        await getHkjcRaceResult({
          raceDate: race.hkjcRaceDate!,
          racecourseCode: race.hkjcRacecourseCode!,
          raceNo: race.hkjcRaceNo!,
        }).catch(() => null),
      );
    }

    const officialResult = resultCache.get(cacheKey);
    if (!officialResult) {
      continue;
    }

    const isWin = officialResult.winner.horseNo === race.selectedHorseNo;
    const payout = isWin ? Math.floor(race.betAmount * race.multiplierUsed) : 0;
    const finalResult = isWin ? "WIN" : "LOSS";

    await prisma.$transaction(async (tx) => {
      const currentRace = await tx.raceResult.findUnique({
        where: { id: race.id },
        select: { result: true },
      });
      if (!currentRace || currentRace.result !== "PENDING") {
        return;
      }

      await tx.raceResult.update({
        where: { id: race.id },
        data: {
          winningHorse: officialResult.winner.horseName,
          winningHorseNo: officialResult.winner.horseNo,
          payout,
          result: finalResult,
          settledAt: new Date(),
        },
      });

      const player = await tx.user.findUniqueOrThrow({ where: { id: race.userId } });

      if (isWin) {
        const balanceBefore = player.coinBalance;
        const balanceAfter = balanceBefore + payout;
        await tx.user.update({
          where: { id: player.id },
          data: { coinBalance: balanceAfter },
        });
        await tx.coinTransaction.create({
          data: {
            userId: player.id,
            type: "RACE_WIN",
            amount: payout,
            balanceBefore,
            balanceAfter,
            relatedRaceId: race.id,
          },
        });
      } else {
        await tx.coinTransaction.create({
          data: {
            userId: player.id,
            type: "RACE_LOSS",
            amount: 0,
            balanceBefore: player.coinBalance,
            balanceAfter: player.coinBalance,
            relatedRaceId: race.id,
          },
        });
      }
    });

    settled += 1;
  }

  return {
    checked: pendingRaces.length,
    settled,
  };
}
