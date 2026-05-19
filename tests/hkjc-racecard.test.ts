import assert from "node:assert/strict";
import test from "node:test";
import {
  getLiveHkjcUpcomingRaceCard,
  parseHkjcRaceCardGraphql,
  parseHkjcRaceCardHtml,
  parseMainHkjcFixtureMeetings,
} from "@/lib/hkjc-racecard";
import { parseHkjcRaceResultHtml } from "@/lib/hkjc-results";

const fixture = `
  <html>
    <body>
      <div class="f_fs13" style="line-height: 20px;">
        <span class="font_wb">Race 1 - BUTTERFLY BAY PLATE</span><br>
        Saturday, May 09, 2026, Sha Tin, 12:30<br>
        Turf, "C" Course, 1000M, Good<br>
        Prize Money: $950,000, -, Griffin Race
      </div>
      <a href="?racedate=2026/05/09&Racecourse=ST&RaceNo=2">Race 2</a>
      <table id="racecardlist">
        <tbody>
          <tr><td>MY Race Card LIST</td></tr>
          <tr>
            <td>Horse No.</td><td>Last 6 Runs</td><td>Colour</td><td>Horse</td>
            <td>Brand No.</td><td>Wt.</td><td>Jockey</td><td>Over Wt.</td>
            <td>Draw</td><td>Trainer</td><td>Int'l Rtg.</td><td>Rtg.</td>
            <td>Rtg.+/-</td><td>Horse Wt. (Declaration)</td><td>Wt.+/-</td>
            <td>Best Time</td><td>Age</td><td>WFA</td><td>Sex</td>
            <td>Season Stakes</td><td>Priority</td><td>Days since Last Run</td>
            <td>Gear</td><td>Owner</td><td>Sire</td><td>Dam</td><td>Import Cat.</td>
          </tr>
          <tr>
            <td>1</td><td>-</td><td></td><td>ALMIGHTY WARRIOR</td>
            <td>L245</td><td>126</td><td>Z Purton</td><td></td>
            <td>3</td><td>K W Lui</td><td>-</td><td>-</td><td>-</td>
            <td>936</td><td>-</td><td></td><td>3</td><td>-</td><td>g</td>
            <td>0</td><td>1</td><td>-</td><td>XB1</td>
            <td>Anthony Chung On Leung</td><td>Saxon Warrior</td><td>One Last Look</td><td>PPG</td>
          </tr>
          <tr>
            <td>2</td><td>1/2/3</td><td></td><td>SHARP PLANET</td>
            <td>L308</td><td>126</td><td>J Moreira</td><td>1</td>
            <td>5</td><td>C Fownes</td><td>-</td><td>75</td><td>-</td>
            <td>1120</td><td>-</td><td>0.56.20</td><td>3</td><td>-</td><td>g</td>
            <td>0</td><td>1</td><td>28</td><td>TT1</td>
            <td>Yiu King Chuen</td><td>Starspangledbanner</td><td>Onyali</td><td>PPG</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
`;

test("HKJC parser extracts race metadata and runners", () => {
  const raceCard = parseHkjcRaceCardHtml(fixture, "https://example.test/racecard");

  assert.ok(raceCard);
  assert.equal(raceCard.sourceUrl, "https://example.test/racecard");
  assert.equal(raceCard.raceDate, "2026/05/09");
  assert.equal(raceCard.racecourseCode, "ST");
  assert.equal(raceCard.raceNo, 1);
  assert.deepEqual(raceCard.raceOptions, [
    { raceNo: 1, raceDate: "2026/05/09", racecourseCode: "ST" },
    { raceNo: 2, raceDate: "2026/05/09", racecourseCode: "ST" },
  ]);
  assert.equal(raceCard.raceName, "BUTTERFLY BAY PLATE");
  assert.equal(raceCard.meetingDate, "Saturday, May 09, 2026");
  assert.equal(raceCard.racecourse, "Sha Tin");
  assert.equal(raceCard.startTime, "12:30");
  assert.equal(raceCard.surface, "Turf");
  assert.equal(raceCard.course, '"C" Course');
  assert.equal(raceCard.distance, "1000M");
  assert.equal(raceCard.going, "Good");
  assert.equal(raceCard.prizeMoney, "$950,000");
  assert.equal(raceCard.raceClass, "-, Griffin Race");
  assert.equal(raceCard.runners.length, 2);
  assert.deepEqual(raceCard.runners[0], {
    horseNo: "1",
    last6Runs: "",
    name: "ALMIGHTY WARRIOR",
    brandNo: "L245",
    weight: "126",
    jockey: "Z Purton",
    overWeight: "",
    draw: "3",
    trainer: "K W Lui",
    rating: "",
    horseWeight: "936",
    bestTime: "",
    age: "3",
    sex: "g",
    daysSinceLastRun: "",
    gear: "XB1",
  });
  assert.deepEqual(raceCard.runners[1], {
    horseNo: "2",
    last6Runs: "1/2/3",
    name: "SHARP PLANET",
    brandNo: "L308",
    weight: "126",
    jockey: "J Moreira",
    overWeight: "1",
    draw: "5",
    trainer: "C Fownes",
    rating: "75",
    horseWeight: "1120",
    bestTime: "0.56.20",
    age: "3",
    sex: "g",
    daysSinceLastRun: "28",
    gear: "TT1",
  });
});

test("HKJC parser returns null for unrecognized markup", () => {
  assert.equal(parseHkjcRaceCardHtml("<html><body>No racecard here</body></html>"), null);
});

test("HKJC GraphQL parser skips overseas meetings and selects a main HK race", () => {
  const raceCard = parseHkjcRaceCardGraphql({
    data: {
      raceMeetings: [
        {
          venueCode: "S1",
          date: "2026-05-10",
          currentNumberOfRace: 2,
          dateOfWeek: "SUN",
          races: [
            {
              no: 1,
              status: "RESULT",
              raceName_en: "3yo 1 win",
              postTime: "2026-05-10T11:25:00+08:00",
              country_en: "Japan",
              distance: 2100,
              go_en: "FAST",
              raceTrack: { description_en: "Dirt" },
              raceCourse: { description_en: "Tokyo Racecourse", displayCode: "" },
              runners: [
                {
                  no: "1",
                  status: "Ran",
                  name_en: "Sky Rex (JPN)",
                  horse: { code: "20260510S10101H" },
                  barrierDrawNumber: "1",
                  handicapWeight: "126",
                  last6run: "1/2/8/5",
                  winOdds: "53",
                  jockey: { name_en: "Taisei Danno" },
                  trainer: { name_en: "Makoto Saito" },
                },
              ],
            },
            {
              no: 2,
              status: "DECLARED",
              raceName_en: "Victoria Mile",
              postTime: "2026-05-10T14:40:00+08:00",
              country_en: "Japan",
              distance: 1600,
              go_en: "GOOD",
              raceClass_en: "Group 1",
              raceTrack: { description_en: "Turf" },
              raceCourse: { description_en: "Tokyo Racecourse", displayCode: "Turf" },
              runners: [
                {
                  no: "7",
                  status: "Declared",
                  name_en: "Alpha Queen (JPN)",
                  horse: { code: "20260510S10207H" },
                  barrierDrawNumber: "8",
                  handicapWeight: "126",
                  currentRating: "103",
                  currentWeight: "1010",
                  gearInfo: "B",
                  last6run: "1/4/2",
                  winOdds: "4.8",
                  jockey: { name_en: "Yuga Kawada" },
                  trainer: { name_en: "H Fujiwara" },
                },
              ],
            },
          ],
        },
        {
          venueCode: "ST",
          date: "2026-05-10",
          currentNumberOfRace: 3,
          dateOfWeek: "SUN",
          races: [
            {
              no: 3,
              status: "DECLARED",
              raceName_en: "Sha Tin Sprint",
              postTime: "2026-05-10T15:10:00+08:00",
              country_en: "Hong Kong",
              distance: 1200,
              go_en: "GOOD",
              raceClass_en: "Class 3",
              raceTrack: { description_en: "Turf" },
              raceCourse: { description_en: "Sha Tin Racecourse", displayCode: "A" },
              runners: [
                {
                  no: "2",
                  status: "Declared",
                  name_en: "Main Circuit",
                  horse: { code: "L123" },
                  barrierDrawNumber: "4",
                  handicapWeight: "126",
                  currentRating: "80",
                  currentWeight: "1080",
                  gearInfo: "B",
                  last6run: "2/1/3",
                  winOdds: "3.2",
                  jockey: { name_en: "Z Purton" },
                  trainer: { name_en: "K W Lui" },
                },
              ],
            },
          ],
        },
      ],
    },
  });

  assert.ok(raceCard);
  assert.equal(raceCard.raceDate, "2026-05-10");
  assert.equal(raceCard.racecourseCode, "ST");
  assert.equal(raceCard.raceNo, 3);
  assert.equal(raceCard.raceName, "Sha Tin Sprint");
  assert.equal(raceCard.meetingDate, "SUN, 2026-05-10");
  assert.equal(raceCard.racecourse, "Sha Tin Racecourse");
  assert.equal(raceCard.startTime, "15:10");
  assert.equal(raceCard.surface, "Turf");
  assert.equal(raceCard.course, "A");
  assert.equal(raceCard.distance, "1200M");
  assert.equal(raceCard.going, "GOOD");
  assert.deepEqual(raceCard.raceOptions, [
    { raceNo: 3, raceDate: "2026-05-10", racecourseCode: "ST" },
  ]);
  assert.deepEqual(raceCard.runners[0], {
    horseNo: "2",
    last6Runs: "2/1/3",
    name: "Main Circuit",
    brandNo: "L123",
    weight: "126",
    jockey: "Z Purton",
    overWeight: "",
    draw: "4",
    trainer: "K W Lui",
    rating: "80",
    horseWeight: "1080",
    bestTime: "",
    age: "",
    sex: "",
    daysSinceLastRun: "",
    gear: "B",
    winOdds: "3.2",
  });
});

test("HKJC GraphQL parser returns null when only overseas meetings exist", () => {
  const raceCard = parseHkjcRaceCardGraphql({
    data: {
      raceMeetings: [
        {
          venueCode: "S1",
          date: "2026-05-10",
          currentNumberOfRace: 2,
          races: [
            {
              no: 2,
              status: "DECLARED",
              raceName_en: "Victoria Mile",
              postTime: "2026-05-10T14:40:00+08:00",
              country_en: "Japan",
              distance: 1600,
              raceCourse: { description_en: "Tokyo Racecourse", displayCode: "Turf" },
              runners: [{ no: "7", status: "Declared", name_en: "Alpha Queen (JPN)" }],
            },
          ],
        },
      ],
    },
  });

  assert.equal(raceCard, null);
});

test("live GraphQL racecards are enriched with runner age and sex from HKJC HTML", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/graphql/base/")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { variables?: { oddsTypes?: string[] } };
      const oddsTypes = body.variables?.oddsTypes ?? [];

      if (oddsTypes.includes("WIN") || oddsTypes.includes("PLA")) {
        return Response.json({
          data: {
            raceMeetings: [
              {
                pmPools: [
                  {
                    oddsType: "WIN",
                    status: "START_SELL",
                    sellStatus: "START_SELL",
                    lastUpdateTime: "10:01",
                    oddsNodes: [{ combString: "01", oddsValue: "4.8", hotFavourite: false }],
                  },
                  {
                    oddsType: "PLA",
                    status: "START_SELL",
                    sellStatus: "START_SELL",
                    lastUpdateTime: "10:01",
                    oddsNodes: [{ combString: "01", oddsValue: "1.7", hotFavourite: false }],
                  },
                ],
              },
            ],
          },
        });
      }

      if (oddsTypes.includes("QIN")) {
        return Response.json({
          data: {
            raceMeetings: [{ pmPools: [] }],
          },
        });
      }

      return Response.json({
        data: {
          raceMeetings: [
            {
              venueCode: "ST",
              date: "2026-05-09",
              currentNumberOfRace: 1,
              dateOfWeek: "SAT",
              races: [
                {
                  no: 1,
                  status: "DECLARED",
                  raceName_en: "BUTTERFLY BAY PLATE",
                  postTime: "2026-05-09T12:30:00+08:00",
                  country_en: "Hong Kong",
                  distance: 1000,
                  go_en: "Good",
                  raceTrack: { description_en: "Turf" },
                  raceCourse: { description_en: "Sha Tin Racecourse", displayCode: "C" },
                  runners: [
                    {
                      no: "1",
                      status: "Declared",
                      name_en: "ALMIGHTY WARRIOR",
                      horse: { code: "L245" },
                      barrierDrawNumber: "3",
                      handicapWeight: "126",
                      currentWeight: "936",
                      currentRating: "",
                      gearInfo: "XB1",
                      last6run: "",
                      winOdds: "4.8",
                      jockey: { name_en: "Z Purton" },
                      trainer: { name_en: "K W Lui" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
    }

    return new Response(fixture, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }) as typeof fetch;

  try {
    const result = await getLiveHkjcUpcomingRaceCard({
      raceDate: "2026/05/09",
      racecourse: "ST",
      raceNo: 1,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.raceCard.runners[0]?.age, "3");
    assert.equal(result.raceCard.runners[0]?.sex, "g");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("HKJC GraphQL parser ignores direct overseas racecourse requests", () => {
  const raceCard = parseHkjcRaceCardGraphql(
    {
      data: {
        raceMeetings: [
          {
            venueCode: "S1",
            date: "2026-05-10",
            currentNumberOfRace: 2,
            races: [
              {
                no: 2,
                status: "DECLARED",
                raceName_en: "Victoria Mile",
                postTime: "2026-05-10T14:40:00+08:00",
                country_en: "Japan",
                distance: 1600,
                raceCourse: { description_en: "Tokyo Racecourse", displayCode: "Turf" },
                runners: [{ no: "7", status: "Declared", name_en: "Alpha Queen (JPN)" }],
              },
            ],
          },
          {
            venueCode: "HV",
            date: "2026-05-10",
            currentNumberOfRace: 1,
            races: [
              {
                no: 1,
                status: "DECLARED",
                raceName_en: "Valley Trophy",
                postTime: "2026-05-10T19:10:00+08:00",
                country_en: "Hong Kong",
                distance: 1650,
                raceCourse: { description_en: "Happy Valley Racecourse", displayCode: "B" },
                runners: [{ no: "1", status: "Declared", name_en: "Valley Star" }],
              },
            ],
          },
        ],
      },
    },
    { raceDate: "2026-05-10", racecourse: "S1", raceNo: 2 },
  );

  assert.ok(raceCard);
  assert.equal(raceCard.racecourseCode, "HV");
  assert.equal(raceCard.raceName, "Valley Trophy");
});

test("HKJC HTML parser returns null for overseas racecards", () => {
  const overseasFixture = fixture.replace("Sha Tin, 12:30", "Tokyo Racecourse, 12:30");

  assert.equal(
    parseHkjcRaceCardHtml(
      overseasFixture,
      "https://example.test/racecard?racedate=2026/05/09&Racecourse=S1&RaceNo=1",
    ),
    null,
  );
});

test("HKJC fixture parser finds upcoming Sha Tin and Happy Valley meetings only", () => {
  const fixtureCalendar = `
    <table>
      <tr class="bg_blue color_w"><td colspan="7">5/2026</td></tr>
      <tr>
        <td class="calendar">
          <p class="f_clear">
            <span class="f_fl f_fs14">10</span>
            <span class="f_fr"><img alt="S1" /></span>
          </p>
          <p><span class="font_wb">1600(1)</span></p>
        </td>
        <td class="calendar">
          <p class="f_clear">
            <span class="f_fl f_fs14">13</span>
            <span class="f_fr"><img alt="HV" /></span>
          </p>
          <p><span class="font_wb">1650(1)</span></p>
          <p><span class="font_wb">1200(2)</span></p>
        </td>
        <td class="calendar">
          <p class="f_clear">
            <span class="f_fl f_fs14">17</span>
            <span class="f_fr"><img alt="ST" /></span>
          </p>
          <p><span class="font_wb">1200(1)</span></p>
        </td>
      </tr>
    </table>
  `;

  assert.deepEqual(parseMainHkjcFixtureMeetings(fixtureCalendar, new Date("2026-05-11T00:00:00+08:00")), [
    { raceDate: "2026-05-13", racecourseCode: "HV", raceCount: 2 },
    { raceDate: "2026-05-17", racecourseCode: "ST", raceCount: 1 },
  ]);
});

test("HKJC result parser extracts official winner", () => {
  const result = parseHkjcRaceResultHtml(`
    <table class="f_tac table_bd">
      <tr>
        <td>Pla.</td><td>Horse No.</td><td>Horse</td><td>Jockey</td><td>Trainer</td>
        <td>Act. Wt.</td><td>Declar. Horse Wt.</td><td>Dr.</td><td>LBW</td>
        <td>RunningPosition</td><td>Finish Time</td><td>Win Odds</td>
      </tr>
      <tr>
        <td>1</td><td>14</td><td>KA YING POWER (H169)</td><td>M L Yeung</td>
        <td>J Size</td><td>118</td><td>1105</td><td>10</td><td>---</td>
        <td>8 8 7 1</td><td>1:22.84</td><td>32</td>
      </tr>
      <tr>
        <td>2</td><td>9</td><td>TEAM HAPPY (J218)</td><td>H Doyle</td>
        <td>P C Ng</td><td>129</td><td>1218</td><td>8</td><td>1-1/4</td>
        <td>2 2 1 2</td><td>1:23.06</td><td>19</td>
      </tr>
    </table>
  `);

  assert.ok(result);
  assert.equal(result.winner.horseNo, "14");
  assert.equal(result.winner.horseName, "KA YING POWER");
  assert.equal(result.winner.finishTime, "1:22.84");
  assert.equal(result.runners.length, 2);
});
