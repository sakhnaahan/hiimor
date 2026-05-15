import { load } from "cheerio";

const HKJC_RESULTS_URL = "https://racing.hkjc.com/en-us/local/information/localresults";
const HKJC_RESULTS_CACHE_SECONDS = 60;
const HKJC_FETCH_TIMEOUT_MS = 10_000;

export type HkjcRaceResultRunner = {
  place: string;
  horseNo: string;
  horseName: string;
  jockey: string;
  finishTime: string;
};

export type HkjcRaceResult = {
  sourceUrl: string;
  runners: HkjcRaceResultRunner[];
  winner: HkjcRaceResultRunner;
};

export type HkjcRaceResultRequest = {
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
};

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function stripBrandNo(horseName: string) {
  return normalizeText(horseName.replace(/\s*\([A-Z0-9]+\)\s*$/i, ""));
}

export function buildHkjcResultsUrl(request: HkjcRaceResultRequest) {
  const url = new URL(HKJC_RESULTS_URL);
  url.searchParams.set("RaceDate", request.raceDate.replace(/-/g, "/"));
  url.searchParams.set("RaceNo", String(request.raceNo));
  url.searchParams.set("Racecourse", request.racecourseCode);
  return url.toString();
}

export function parseHkjcRaceResultHtml(html: string, sourceUrl = HKJC_RESULTS_URL): HkjcRaceResult | null {
  const $ = load(html);
  let resultRows: HkjcRaceResultRunner[] = [];

  $("table").each((_, table) => {
    const headerCells = $(table)
      .find("tr")
      .first()
      .children("td, th")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));

    if (
      headerCells[0] !== "Pla." ||
      headerCells[1] !== "Horse No." ||
      headerCells[2] !== "Horse" ||
      !headerCells.includes("Jockey")
    ) {
      return;
    }

    resultRows = $(table)
      .find("tr")
      .toArray()
      .slice(1)
      .map((row) => {
        const cells = $(row)
          .children("td, th")
          .toArray()
          .map((cell) => normalizeText($(cell).text()));

        if (cells.length < 4 || !/^\d+$/.test(cells[0] ?? "")) {
          return null;
        }

        return {
          place: cells[0],
          horseNo: cells[1] ?? "",
          horseName: stripBrandNo(cells[2] ?? ""),
          jockey: cells[3] ?? "",
          finishTime: cells[10] ?? "",
        };
      })
      .filter((runner): runner is HkjcRaceResultRunner => runner !== null);
  });

  const winner = resultRows.find((runner) => runner.place === "1");
  if (!winner) {
    return null;
  }

  return {
    sourceUrl,
    runners: resultRows,
    winner,
  };
}

export async function getHkjcRaceResult(request: HkjcRaceResultRequest) {
  const sourceUrl = buildHkjcResultsUrl(request);
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "private-horse-race/0.1 (+https://racing.hkjc.com)",
    },
    signal: AbortSignal.timeout(HKJC_FETCH_TIMEOUT_MS),
    next: { revalidate: HKJC_RESULTS_CACHE_SECONDS },
  });

  if (!response.ok) {
    return null;
  }

  return parseHkjcRaceResultHtml(await response.text(), sourceUrl);
}
