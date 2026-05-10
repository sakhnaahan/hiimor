import { load } from "cheerio";
import { getHkjcWinOdds, isHkjcWinPoolOpen } from "@/lib/hkjc-odds";

const HKJC_RACECARD_URL = "https://racing.hkjc.com/en-us/local/information/racecard";
const HKJC_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HKJC_CACHE_SECONDS = 60;
const HKJC_FETCH_TIMEOUT_MS = 10_000;
const MAIN_HKJC_RACECOURSE_CODES = new Set(["ST", "HV"]);
const MAIN_HKJC_RACECOURSE_LABELS = new Set([
  "happy valley",
  "happy valley racecourse",
  "sha tin",
  "sha tin racecourse",
]);

const HKJC_RACE_MEETINGS_QUERY = `
fragment raceFragment on Race {
  id
  no
  status
  raceName_en
  raceName_ch
  postTime
  country_en
  country_ch
  distance
  wageringFieldSize
  go_en
  go_ch
  ratingType
  raceTrack {
    description_en
    description_ch
  }
  raceCourse {
    description_en
    description_ch
    displayCode
  }
  claCode
  raceClass_en
  raceClass_ch
  judgeSigns {
    value_en
  }
}

fragment racingBlockFragment on RaceMeeting {
  jpEsts: pmPools(
    oddsTypes: [WIN, PLA, TCE, TRI, FF, QTT, DT, TT, SixUP]
    filters: ["jackpot", "estimatedDividend"]
  ) {
    leg {
      number
      races
    }
    oddsType
    jackpot
    estimatedDividend
    mergedPoolId
  }
  poolInvs: pmPools(
    oddsTypes: [WIN, PLA, QIN, QPL, CWA, CWB, CWC, IWN, FCT, TCE, TRI, FF, QTT, DBL, TBL, DT, TT, SixUP]
  ) {
    id
    leg {
      races
    }
  }
  penetrometerReadings(filters: ["first"]) {
    reading
    readingTime
  }
  hammerReadings(filters: ["first"]) {
    reading
    readingTime
  }
  changeHistories(filters: ["top3"]) {
    type
    time
    raceNo
    runnerNo
    horseName_ch
    horseName_en
    jockeyName_ch
    jockeyName_en
    scratchHorseName_ch
    scratchHorseName_en
    handicapWeight
    scrResvIndicator
  }
}

query raceMeetings($date: String, $venueCode: String) {
  timeOffset {
    rc
  }
  activeMeetings: raceMeetings {
    id
    venueCode
    date
    status
    races {
      no
      postTime
      status
      wageringFieldSize
    }
  }
  raceMeetings(date: $date, venueCode: $venueCode) {
    id
    status
    venueCode
    date
    totalNumberOfRace
    currentNumberOfRace
    dateOfWeek
    meetingType
    totalInvestment
    country {
      code
      namech
      nameen
      seq
    }
    races {
      ...raceFragment
      runners {
        id
        no
        standbyNo
        status
        name_ch
        name_en
        horse {
          id
          code
        }
        color
        barrierDrawNumber
        handicapWeight
        currentWeight
        currentRating
        internationalRating
        gearInfo
        racingColorFileName
        allowance
        trainerPreference
        last6run
        saddleClothNo
        trumpCard
        priority
        finalPosition
        deadHeat
        winOdds
        jockey {
          code
          name_en
          name_ch
        }
        trainer {
          code
          name_en
          name_ch
        }
      }
    }
    obSt: pmPools(oddsTypes: [WIN, PLA]) {
      leg {
        races
      }
      oddsType
      comingleStatus
    }
    poolInvs: pmPools(
      oddsTypes: [WIN, PLA, QIN, QPL, CWA, CWB, CWC, IWN, FCT, TCE, TRI, FF, QTT, DBL, TBL, DT, TT, SixUP]
    ) {
      id
      leg {
        number
        races
      }
      status
      sellStatus
      oddsType
      investment
      mergedPoolId
      lastUpdateTime
    }
    ...racingBlockFragment
    pmPools(oddsTypes: []) {
      id
    }
    jkcInstNo: foPools(oddsTypes: [JKC], filters: ["top"]) {
      instNo
    }
    tncInstNo: foPools(oddsTypes: [TNC], filters: ["top"]) {
      instNo
    }
  }
}`;

export type HkjcRunner = {
  horseNo: string;
  last6Runs: string;
  name: string;
  brandNo: string;
  weight: string;
  jockey: string;
  overWeight: string;
  draw: string;
  trainer: string;
  rating: string;
  horseWeight: string;
  bestTime: string;
  age: string;
  sex: string;
  daysSinceLastRun: string;
  gear: string;
  winOdds?: string;
  marketChance?: number;
  hotFavourite?: boolean;
  oddsAvailable?: boolean;
  oddsLastUpdateTime?: string;
};

export type HkjcRaceOption = {
  raceNo: number;
  raceDate: string;
  racecourseCode: string;
};

export type HkjcRaceCard = {
  sourceUrl: string;
  raceDate: string;
  racecourseCode: string;
  raceNo: number;
  raceName: string;
  meetingDate: string;
  racecourse: string;
  startTime: string;
  surface: string;
  course: string;
  distance: string;
  going: string;
  prizeMoney: string;
  raceClass: string;
  oddsAvailable: boolean;
  oddsLastUpdateTime: string;
  raceOptions: HkjcRaceOption[];
  runners: HkjcRunner[];
};

export type HkjcRaceCardResult =
  | {
      ok: true;
      raceCard: HkjcRaceCard;
    }
  | {
      ok: false;
      message: string;
      sourceUrl: string;
    };

type RaceRequest = {
  raceDate?: string;
  racecourse?: string;
  raceNo?: number;
};

type HkjcGraphqlRunner = {
  no: string;
  standbyNo?: string | null;
  status?: string | null;
  name_en?: string | null;
  horse?: { code?: string | null } | null;
  barrierDrawNumber?: string | null;
  handicapWeight?: string | null;
  currentWeight?: string | null;
  currentRating?: string | null;
  internationalRating?: string | null;
  gearInfo?: string | null;
  last6run?: string | null;
  winOdds?: string | null;
  jockey?: { name_en?: string | null } | null;
  trainer?: { name_en?: string | null } | null;
};

type HkjcGraphqlRace = {
  no: number;
  status?: string | null;
  raceName_en?: string | null;
  postTime?: string | null;
  country_en?: string | null;
  distance?: number | string | null;
  go_en?: string | null;
  raceClass_en?: string | null;
  raceTrack?: { description_en?: string | null } | null;
  raceCourse?: { description_en?: string | null; displayCode?: string | null } | null;
  runners?: HkjcGraphqlRunner[] | null;
};

type HkjcGraphqlMeeting = {
  venueCode: string;
  date: string;
  status?: string | null;
  totalNumberOfRace?: number | null;
  currentNumberOfRace?: number | null;
  dateOfWeek?: string | null;
  meetingType?: string | null;
  country?: Array<{ nameen?: string | null }> | null;
  races?: HkjcGraphqlRace[] | null;
};

type HkjcGraphqlResponse = {
  data?: {
    raceMeetings?: HkjcGraphqlMeeting[] | null;
  };
  errors?: Array<{ message?: string }>;
};

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeRacecourseCode(value: string | null | undefined) {
  return normalizeText(value ?? "").toUpperCase();
}

function normalizeRacecourseLabel(value: string | null | undefined) {
  return normalizeText(value ?? "").toLowerCase();
}

export function isMainHkjcRacecourse(value: string | null | undefined) {
  return (
    MAIN_HKJC_RACECOURSE_CODES.has(normalizeRacecourseCode(value)) ||
    MAIN_HKJC_RACECOURSE_LABELS.has(normalizeRacecourseLabel(value))
  );
}

function isAllowedMeeting(meeting: HkjcGraphqlMeeting) {
  return isMainHkjcRacecourse(meeting.venueCode);
}

function sanitizeRaceRequest(request: RaceRequest = {}) {
  if (request.racecourse && !isMainHkjcRacecourse(request.racecourse)) {
    return {};
  }

  return request.racecourse
    ? {
        ...request,
        racecourse: normalizeRacecourseCode(request.racecourse),
      }
    : request;
}

function cleanDash(value: string) {
  const normalized = normalizeText(value);
  return normalized === "-" ? "" : normalized;
}

function normalizeRaceDateForGraphql(value: string | undefined) {
  return value ? value.replace(/\//g, "-") : undefined;
}

function normalizeRaceDateForUrl(value: string | undefined) {
  return value ? value.replace(/-/g, "/") : undefined;
}

function formatRaceStartTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const timeMatch = value.match(/T(\d{2}):(\d{2})/);
  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : normalizeText(value);
}

function buildRaceCardUrl(request: RaceRequest = {}) {
  const url = new URL(HKJC_RACECARD_URL);

  if (request.raceDate) {
    url.searchParams.set("racedate", normalizeRaceDateForUrl(request.raceDate) ?? request.raceDate);
  }

  if (request.racecourse) {
    url.searchParams.set("Racecourse", request.racecourse);
  }

  if (request.raceNo) {
    url.searchParams.set("RaceNo", String(request.raceNo));
  }

  return url.toString();
}

function chooseGraphqlRace(meeting: HkjcGraphqlMeeting, raceNo?: number) {
  const races = (meeting.races ?? []).filter(
    (race) => (race.runners?.length ?? 0) > 0 && !["RESULT", "CLOSED"].includes(String(race.status ?? "").toUpperCase()),
  );
  if (raceNo) {
    return races.find((race) => Number(race.no) === raceNo) ?? null;
  }

  return (
    races[0] ??
    races.find((race) => Number(race.no) === meeting.currentNumberOfRace) ??
    races[races.length - 1] ??
    null
  );
}

function buildGraphqlSourceUrl(meeting: HkjcGraphqlMeeting, raceNo: number) {
  return buildRaceCardUrl({
    raceDate: meeting.date,
    racecourse: meeting.venueCode,
    raceNo,
  });
}

function mapGraphqlRaceCard(meeting: HkjcGraphqlMeeting, race: HkjcGraphqlRace): HkjcRaceCard | null {
  if (!isAllowedMeeting(meeting)) {
    return null;
  }

  const runners = (race.runners ?? [])
    .filter((runner) => runner.no && String(runner.status ?? "").toUpperCase() !== "SCRATCHED")
    .map((runner): HkjcRunner => ({
      horseNo: String(Number.parseInt(runner.no, 10) || runner.no),
      last6Runs: cleanDash(runner.last6run ?? ""),
      name: normalizeText(runner.name_en ?? ""),
      brandNo: normalizeText(runner.horse?.code ?? ""),
      weight: normalizeText(runner.handicapWeight ?? ""),
      jockey: normalizeText(runner.jockey?.name_en ?? ""),
      overWeight: "",
      draw: cleanDash(runner.barrierDrawNumber ?? ""),
      trainer: normalizeText(runner.trainer?.name_en ?? ""),
      rating: cleanDash(runner.currentRating ?? runner.internationalRating ?? ""),
      horseWeight: cleanDash(runner.currentWeight ?? ""),
      bestTime: "",
      age: "",
      sex: "",
      daysSinceLastRun: "",
      gear: cleanDash(runner.gearInfo ?? ""),
      winOdds: runner.winOdds ? normalizeText(runner.winOdds) : undefined,
    }))
    .filter((runner) => runner.name);

  if (runners.length === 0) {
    return null;
  }

  const raceNo = Number(race.no);
  const racecourse =
    normalizeText(race.raceCourse?.description_en ?? "") ||
    normalizeText(race.country_en ?? "") ||
    normalizeText(meeting.country?.[0]?.nameen ?? "") ||
    meeting.venueCode;
  const raceOptions = (meeting.races ?? [])
    .filter(
      (option) =>
        Number.isInteger(Number(option.no)) &&
        !["RESULT", "CLOSED"].includes(String(option.status ?? "").toUpperCase()) &&
        (option.runners?.length ?? 0) > 0,
    )
    .map((option) => ({
      raceNo: Number(option.no),
      raceDate: meeting.date,
      racecourseCode: meeting.venueCode,
    }))
    .sort((left, right) => left.raceNo - right.raceNo);

  return {
    sourceUrl: buildGraphqlSourceUrl(meeting, raceNo),
    raceDate: meeting.date,
    racecourseCode: meeting.venueCode,
    raceNo,
    raceName: normalizeText(race.raceName_en ?? `${racecourse} Race ${raceNo}`),
    meetingDate: [meeting.dateOfWeek, meeting.date].filter(Boolean).join(", "),
    racecourse,
    startTime: formatRaceStartTime(race.postTime),
    surface: normalizeText(race.raceTrack?.description_en ?? ""),
    course: normalizeText(race.raceCourse?.displayCode ?? ""),
    distance: race.distance ? `${race.distance}M` : "",
    going: normalizeText(race.go_en ?? ""),
    prizeMoney: "",
    raceClass: normalizeText(race.raceClass_en ?? ""),
    oddsAvailable: false,
    oddsLastUpdateTime: "",
    raceOptions,
    runners,
  };
}

export function parseHkjcRaceCardGraphql(json: HkjcGraphqlResponse, request: RaceRequest = {}) {
  const sanitizedRequest = sanitizeRaceRequest(request);
  const requestedRaceDate = normalizeRaceDateForGraphql(sanitizedRequest.raceDate);
  const meetings = (json.data?.raceMeetings ?? []).filter(isAllowedMeeting);
  const matchingMeetings = meetings.filter((meeting) => {
    if (requestedRaceDate && meeting.date !== requestedRaceDate) {
      return false;
    }

    return !sanitizedRequest.racecourse || meeting.venueCode === sanitizedRequest.racecourse;
  });

  for (const meeting of matchingMeetings.length ? matchingMeetings : meetings) {
    const race = chooseGraphqlRace(meeting, sanitizedRequest.raceNo);
    if (!race) {
      continue;
    }

    const raceCard = mapGraphqlRaceCard(meeting, race);
    if (raceCard) {
      return raceCard;
    }
  }

  return null;
}

async function getHkjcRaceCardFromGraphql(request: RaceRequest = {}) {
  const sanitizedRequest = sanitizeRaceRequest(request);
  const response = await fetch(HKJC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "private-horse-race/0.1 (+https://bet.hkjc.com)",
    },
    signal: AbortSignal.timeout(HKJC_FETCH_TIMEOUT_MS),
    body: JSON.stringify({
      query: HKJC_RACE_MEETINGS_QUERY,
      variables: {
        date: normalizeRaceDateForGraphql(sanitizedRequest.raceDate),
        venueCode: sanitizedRequest.racecourse,
      },
    }),
    next: { revalidate: HKJC_CACHE_SECONDS },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as HkjcGraphqlResponse;
  return parseHkjcRaceCardGraphql(json, request);
}

function getSearchParamCaseInsensitive(url: URL, name: string) {
  const lowerName = name.toLowerCase();
  for (const [key, value] of url.searchParams.entries()) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return "";
}

function parseRaceParams($: ReturnType<typeof load>, sourceUrl: string) {
  const sourceParams = new URL(sourceUrl, HKJC_RACECARD_URL);
  const sourceRaceDate = getSearchParamCaseInsensitive(sourceParams, "racedate");
  const sourceRacecourseCode = getSearchParamCaseInsensitive(sourceParams, "Racecourse");
  if (sourceRaceDate && sourceRacecourseCode) {
    return {
      raceDate: sourceRaceDate,
      racecourseCode: sourceRacecourseCode,
    };
  }

  const paramHref =
    $("a[href*='racedate='], a[href*='RaceDate=']")
      .toArray()
      .map((element) => $(element).attr("href"))
      .find(Boolean) ?? sourceUrl;
  const url = new URL(paramHref, HKJC_RACECARD_URL);

  return {
    raceDate: getSearchParamCaseInsensitive(url, "racedate"),
    racecourseCode: getSearchParamCaseInsensitive(url, "Racecourse"),
  };
}

function parseRaceOptions($: ReturnType<typeof load>, currentRace: HkjcRaceOption) {
  const options = new Map<number, HkjcRaceOption>();
  options.set(currentRace.raceNo, currentRace);

  $("a[href*='RaceNo='], a[href*='raceno=']")
    .toArray()
    .forEach((element) => {
      const href = $(element).attr("href");
      if (!href) {
        return;
      }

      const url = new URL(href, HKJC_RACECARD_URL);
      const raceNo = Number(getSearchParamCaseInsensitive(url, "RaceNo"));
      const raceDate = getSearchParamCaseInsensitive(url, "racedate") || currentRace.raceDate;
      const racecourseCode = getSearchParamCaseInsensitive(url, "Racecourse") || currentRace.racecourseCode;

      if (
        Number.isInteger(raceNo) &&
        raceNo > 0 &&
        raceDate &&
        racecourseCode === currentRace.racecourseCode &&
        isMainHkjcRacecourse(racecourseCode)
      ) {
        options.set(raceNo, { raceNo, raceDate, racecourseCode });
      }
    });

  return [...options.values()].sort((left, right) => left.raceNo - right.raceNo);
}

function splitHeadingLines(headingHtml: string) {
  const htmlWithBreaks = headingHtml.replace(/<br\s*\/?>/gi, "\n");
  return load(`<div>${htmlWithBreaks}</div>`)("div")
    .text()
    .split("\n")
    .map(normalizeText)
    .filter(Boolean);
}

function parseRaceDetails(details: string) {
  const parts = details.split(",").map(normalizeText).filter(Boolean);
  const surface = parts[0] ?? "";
  const distanceIndex = parts.findIndex((part) => /\d+\s*M$/i.test(part));
  const distance = distanceIndex >= 0 ? parts[distanceIndex] : "";
  const course = distanceIndex > 1 ? parts.slice(1, distanceIndex).join(", ") : "";
  const going = distanceIndex >= 0 ? parts.slice(distanceIndex + 1).join(", ") : parts.slice(1).join(", ");

  return { surface, course, distance, going };
}

function parsePrizeLine(line: string) {
  const match = line.match(/^Prize Money:\s*(\$\d[\d,]*)(?:,\s*(.*))?$/i);
  return {
    prizeMoney: match?.[1] ?? "",
    raceClass: normalizeText(match?.[2] ?? ""),
  };
}

export function parseHkjcRaceCardHtml(html: string, sourceUrl = HKJC_RACECARD_URL): HkjcRaceCard | null {
  const $ = load(html);
  const heading = $("span.font_wb")
    .filter((_, element) => /^Race\s+\d+\s+-/i.test(normalizeText($(element).text())))
    .first()
    .parent();

  const headingHtml = heading.html();
  if (!headingHtml) {
    return null;
  }

  const [titleLine, meetingLine, detailsLine, prizeLine] = splitHeadingLines(headingHtml);
  const titleMatch = titleLine?.match(/^Race\s+(\d+)\s+-\s+(.+)$/i);
  const meetingMatch = meetingLine?.match(/^(.+\d{4}),\s*([^,]+),\s*([0-9:]+)$/);

  if (!titleMatch || !meetingMatch || !detailsLine || !prizeLine) {
    return null;
  }

  const details = parseRaceDetails(detailsLine);
  const prize = parsePrizeLine(prizeLine);
  const params = parseRaceParams($, sourceUrl);
  const racecourse = normalizeText(meetingMatch[2] ?? "");
  if (!isMainHkjcRacecourse(params.racecourseCode) && !isMainHkjcRacecourse(racecourse)) {
    return null;
  }

  const raceNo = Number(titleMatch[1]);
  const currentRace = {
    raceNo,
    raceDate: params.raceDate,
    racecourseCode: params.racecourseCode,
  };
  const runners = $("#racecardlist tr")
    .toArray()
    .map((row) => {
      const cells = $(row)
        .children("td, th")
        .toArray()
        .map((cell) => normalizeText($(cell).text()));

      if (cells.length < 10 || !/^\d+$/.test(cells[0] ?? "")) {
        return null;
      }

      return {
        horseNo: cells[0],
        last6Runs: cleanDash(cells[1] ?? ""),
        name: cells[3] ?? "",
        brandNo: cells[4] ?? "",
        weight: cells[5] ?? "",
        jockey: cells[6] ?? "",
        overWeight: cleanDash(cells[7] ?? ""),
        draw: cells[8] ?? "",
        trainer: cells[9] ?? "",
        rating: cleanDash(cells[11] ?? ""),
        horseWeight: cleanDash(cells[13] ?? ""),
        bestTime: cleanDash(cells[15] ?? ""),
        age: cleanDash(cells[16] ?? ""),
        sex: cleanDash(cells[18] ?? ""),
        daysSinceLastRun: cleanDash(cells[21] ?? ""),
        gear: cleanDash(cells[22] ?? ""),
      };
    })
    .filter((runner): runner is HkjcRunner => runner !== null);

  if (runners.length === 0) {
    return null;
  }

  return {
    sourceUrl,
    raceDate: params.raceDate,
    racecourseCode: params.racecourseCode,
    raceNo,
    raceName: normalizeText(titleMatch[2] ?? ""),
    meetingDate: normalizeText(meetingMatch[1] ?? ""),
    racecourse,
    startTime: normalizeText(meetingMatch[3] ?? ""),
    ...details,
    ...prize,
    oddsAvailable: false,
    oddsLastUpdateTime: "",
    raceOptions: parseRaceOptions($, currentRace),
    runners,
  };
}

export async function getHkjcUpcomingRaceCard(request: RaceRequest = {}): Promise<HkjcRaceCardResult> {
  const sanitizedRequest = sanitizeRaceRequest(request);
  const sourceUrl = buildRaceCardUrl(sanitizedRequest);

  try {
    const graphqlRaceCard = await getHkjcRaceCardFromGraphql(sanitizedRequest).catch(() => null);
    if (graphqlRaceCard) {
      return { ok: true, raceCard: await hydrateRaceCardOdds(graphqlRaceCard) };
    }

    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "private-horse-race/0.1 (+https://racing.hkjc.com)",
      },
      signal: AbortSignal.timeout(HKJC_FETCH_TIMEOUT_MS),
      next: { revalidate: HKJC_CACHE_SECONDS },
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `HKJC returned HTTP ${response.status}.`,
        sourceUrl,
      };
    }

    const raceCard = parseHkjcRaceCardHtml(await response.text(), sourceUrl);
    if (!raceCard) {
      return {
        ok: false,
        message: "HKJC racecard format was not recognized.",
        sourceUrl,
      };
    }

    if (raceCard.raceDate && raceCard.racecourseCode) {
      await hydrateRaceCardOdds(raceCard);
    }

    return { ok: true, raceCard };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "HKJC racecard fetch failed.",
      sourceUrl,
    };
  }
}

async function hydrateRaceCardOdds(raceCard: HkjcRaceCard) {
  if (!raceCard.raceDate || !raceCard.racecourseCode) {
    return raceCard;
  }

  const odds = await getHkjcWinOdds({
    raceDate: raceCard.raceDate,
    racecourseCode: raceCard.racecourseCode,
    raceNo: raceCard.raceNo,
  }).catch(() => []);
  const oddsByHorseNo = new Map(odds.map((entry) => [entry.horseNo, entry]));

  raceCard.runners = raceCard.runners.map((runner) => {
    const runnerOdds = oddsByHorseNo.get(runner.horseNo);
    return runnerOdds
      ? {
          ...runner,
          ...runnerOdds,
          oddsAvailable: isHkjcWinPoolOpen(runnerOdds.poolStatus, runnerOdds.sellStatus),
          oddsLastUpdateTime: runnerOdds.lastUpdateTime,
        }
      : { ...runner, oddsAvailable: false };
  });
  raceCard.oddsAvailable = raceCard.runners.some((runner) => runner.oddsAvailable);
  raceCard.oddsLastUpdateTime = odds.find((entry) => entry.lastUpdateTime)?.lastUpdateTime ?? "";

  return raceCard;
}
