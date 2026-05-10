const HKJC_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HKJC_ODDS_CACHE_SECONDS = 60;

type HkjcOddsNode = {
  combString: string;
  oddsValue: string;
  hotFavourite: boolean;
};

type HkjcOddsResponse = {
  data?: {
    raceMeetings?: Array<{
      pmPools?: Array<{
        status?: string;
        sellStatus?: string;
        oddsType: string;
        lastUpdateTime?: string;
        oddsNodes?: HkjcOddsNode[];
      }>;
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

const WIN_ODDS_QUERY = `
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

export function calculateMarketChance(winOdds: string) {
  const odds = Number.parseFloat(winOdds);
  if (!Number.isFinite(odds) || odds <= 0) {
    return null;
  }

  return Math.round((100 / odds) * 10) / 10;
}

export function parseWinOdds(value: string | undefined | null) {
  const odds = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(odds) || odds <= 0) {
    return null;
  }

  return Math.round(odds * 100) / 100;
}

export function isHkjcWinPoolOpen(status?: string, sellStatus?: string) {
  const normalizedStatus = String(status ?? "").toUpperCase();
  const normalizedSellStatus = String(sellStatus ?? "").toUpperCase();
  return normalizedStatus === "START_SELL" && normalizedSellStatus === "START_SELL";
}

export async function getHkjcWinOdds({
  raceDate,
  racecourseCode,
  raceNo,
}: {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
}) {
  const response = await fetch(HKJC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "private-horse-race/0.1 (+https://bet.hkjc.com)",
    },
    body: JSON.stringify({
      query: WIN_ODDS_QUERY,
      variables: {
        date: raceDate,
        venueCode: racecourseCode,
        oddsTypes: ["WIN"],
        raceNo,
      },
    }),
    next: { revalidate: HKJC_ODDS_CACHE_SECONDS },
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as HkjcOddsResponse;
  const winPool = json.data?.raceMeetings?.[0]?.pmPools?.find((pool) => pool.oddsType === "WIN");
  if (!winPool?.oddsNodes) {
    return [];
  }

  return winPool.oddsNodes
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
