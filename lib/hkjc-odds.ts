const HKJC_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HKJC_ODDS_CACHE_SECONDS = 60;
const HKJC_FETCH_TIMEOUT_MS = 10_000;

type HkjcOddsNode = {
  combString: string;
  oddsValue: string;
  hotFavourite: boolean;
};

type HkjcOddsPool = {
  status?: string;
  sellStatus?: string;
  oddsType: string;
  lastUpdateTime?: string;
  oddsNodes?: HkjcOddsNode[];
};

type HkjcOddsResponse = {
  data?: {
    raceMeetings?: Array<{
      pmPools?: HkjcOddsPool[];
    }>;
  };
};

export type HkjcWinOdds = {
  horseNo: string;
  winOdds: string;
  marketChance: number;
  hotFavourite: boolean;
  poolStatus: string;
  sellStatus: string;
  lastUpdateTime: string;
};

export type HkjcRunnerOdds = HkjcWinOdds & {
  placeOdds?: string;
  placeMarketChance?: number;
  placePoolStatus?: string;
  placeSellStatus?: string;
  placeLastUpdateTime?: string;
};

export type HkjcQuinellaOdds = {
  horseNoA: string;
  horseNoB: string;
  odds: string;
  poolStatus: string;
  sellStatus: string;
  lastUpdateTime: string;
  inferred: boolean;
};

const ODDS_QUERY = `
      query racing($date: String, $venueCode: String, $oddsTypes: [OddsType], $raceNo: Int) {
          raceMeetings(date: $date, venueCode: $venueCode)
          {
            pmPools(oddsTypes: $oddsTypes, raceNo: $raceNo) {
              id
              status
              sellStatus
              oddsType
              lastUpdateTime
              guarantee
              minTicketCost
              name_en
              name_ch
              leg {
                number
                races
              }
              cWinSelections {
                composite
                name_ch
                name_en
                starters
              }
              oddsNodes {
                combString
                oddsValue
                hotFavourite
                oddsDropValue
                bankerOdds {
                  combString
                  oddsValue
                }
              }
            }
          }
      }
  `;

function normalizeHorseNo(combString: string) {
  const normalized = Number.parseInt(combString, 10);
  return Number.isFinite(normalized) ? String(normalized) : combString;
}

function compareHorseNos(left: string, right: string) {
  return Number.parseInt(left, 10) - Number.parseInt(right, 10);
}

function normalizeQuinellaPair(combString: string) {
  const horseNos = (combString.match(/\d+/g) ?? [])
    .map((value) => normalizeHorseNo(value))
    .filter(Boolean)
    .sort(compareHorseNos);

  return horseNos.length === 2 && horseNos[0] !== horseNos[1]
    ? { horseNoA: horseNos[0], horseNoB: horseNos[1] }
    : null;
}

export function calculateMarketChance(winOdds: string) {
  const odds = Number.parseFloat(winOdds);
  if (!Number.isFinite(odds) || odds <= 0) {
    return null;
  }

  return Math.round((100 / odds) * 10) / 10;
}

export function parseOdds(value: string | undefined | null) {
  const odds = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(odds) || odds <= 0) {
    return null;
  }

  return Math.round(odds * 100) / 100;
}

export function parseWinOdds(value: string | undefined | null) {
  return parseOdds(value);
}

export function isHkjcPoolOpen(status?: string, sellStatus?: string) {
  const normalizedStatus = String(status ?? "").toUpperCase();
  const normalizedSellStatus = String(sellStatus ?? "").toUpperCase();
  return normalizedStatus === "START_SELL" && normalizedSellStatus === "START_SELL";
}

export function isHkjcWinPoolOpen(status?: string, sellStatus?: string) {
  return isHkjcPoolOpen(status, sellStatus);
}

function mapWinPool(winPool: HkjcOddsPool) {
  return (winPool.oddsNodes ?? [])
    .map((node): HkjcWinOdds | null => {
      const marketChance = calculateMarketChance(node.oddsValue);
      if (marketChance === null) {
        return null;
      }

      return {
        horseNo: normalizeHorseNo(node.combString),
        winOdds: node.oddsValue,
        marketChance,
        hotFavourite: node.hotFavourite,
        poolStatus: winPool.status ?? "",
        sellStatus: winPool.sellStatus ?? "",
        lastUpdateTime: winPool.lastUpdateTime ?? "",
      };
    })
    .filter((odds): odds is HkjcWinOdds => odds !== null);
}

export function parseHkjcRunnerOddsResponse(json: HkjcOddsResponse) {
  const pools = json.data?.raceMeetings?.[0]?.pmPools ?? [];
  const winPool = pools.find((pool) => pool.oddsType === "WIN");
  if (!winPool?.oddsNodes) {
    return [];
  }

  const oddsByHorseNo = new Map<string, HkjcRunnerOdds>(mapWinPool(winPool).map((entry) => [entry.horseNo, entry]));
  const placePool = pools.find((pool) => pool.oddsType === "PLA");
  for (const node of placePool?.oddsNodes ?? []) {
    const placeMarketChance = calculateMarketChance(node.oddsValue);
    if (placeMarketChance === null) {
      continue;
    }

    const horseNo = normalizeHorseNo(node.combString);
    const existing = oddsByHorseNo.get(horseNo);
    if (existing) {
      oddsByHorseNo.set(horseNo, {
        ...existing,
        placeOdds: node.oddsValue,
        placeMarketChance,
        placePoolStatus: placePool?.status ?? "",
        placeSellStatus: placePool?.sellStatus ?? "",
        placeLastUpdateTime: placePool?.lastUpdateTime ?? "",
      });
    }
  }

  return [...oddsByHorseNo.values()];
}

export function parseHkjcQuinellaOddsResponse(json: HkjcOddsResponse) {
  const pools = json.data?.raceMeetings?.[0]?.pmPools ?? [];
  const quinellaPool = pools.find((pool) => pool.oddsType === "QIN");
  if (!quinellaPool?.oddsNodes) {
    return [];
  }

  const entries = new Map<string, HkjcQuinellaOdds>();
  for (const node of quinellaPool.oddsNodes) {
    const normalizedPair = normalizeQuinellaPair(node.combString);
    const parsedOdds = parseOdds(node.oddsValue);
    if (!normalizedPair || parsedOdds === null) {
      continue;
    }

    const key = `${normalizedPair.horseNoA}|${normalizedPair.horseNoB}`;
    entries.set(key, {
      ...normalizedPair,
      odds: String(parsedOdds),
      poolStatus: quinellaPool.status ?? "",
      sellStatus: quinellaPool.sellStatus ?? "",
      lastUpdateTime: quinellaPool.lastUpdateTime ?? "",
      inferred: false,
    });
  }

  return [...entries.values()];
}

function createOddsRequest({
  raceDate,
  racecourseCode,
  raceNo,
  oddsTypes,
}: {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
  oddsTypes: string[];
}) {
  return fetch(HKJC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://bet.hkjc.com",
      referer: "https://bet.hkjc.com/en/racing/pwin",
      "user-agent": "Mozilla/5.0 (compatible; private-horse-race/0.1; +https://bet.hkjc.com)",
    },
    signal: AbortSignal.timeout(HKJC_FETCH_TIMEOUT_MS),
    body: JSON.stringify({
      query: ODDS_QUERY,
      variables: {
        date: raceDate.replace(/\//g, "-"),
        venueCode: racecourseCode,
        oddsTypes,
        raceNo,
      },
    }),
    next: { revalidate: HKJC_ODDS_CACHE_SECONDS },
  });
}

export async function getHkjcRunnerOdds({
  raceDate,
  racecourseCode,
  raceNo,
}: {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
}) {
  const response = await createOddsRequest({
    raceDate,
    racecourseCode,
    raceNo,
    oddsTypes: ["WIN", "PLA"],
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as HkjcOddsResponse;
  return parseHkjcRunnerOddsResponse(json);
}

export async function getHkjcQuinellaOdds({
  raceDate,
  racecourseCode,
  raceNo,
}: {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
}) {
  try {
    const response = await createOddsRequest({
      raceDate,
      racecourseCode,
      raceNo,
      oddsTypes: ["QIN"],
    });

    if (response.ok) {
      const json = (await response.json()) as HkjcOddsResponse;
      const officialOdds = parseHkjcQuinellaOddsResponse(json);
      if (officialOdds.length > 0) {
        return officialOdds;
      }
    }
  } catch {
    // Treat missing or blocked official Quinella pools as unavailable.
  }

  return [];
}

export async function getHkjcWinOdds(request: {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
}) {
  return getHkjcRunnerOdds(request);
}
