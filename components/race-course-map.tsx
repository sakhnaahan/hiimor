import { getRaceCourseMapModel } from "@/lib/race-course-map";
import type { HkjcRaceCard } from "@/lib/hkjc-racecard";

export function RaceCourseMap({ raceCard }: { raceCard: HkjcRaceCard }) {
  const map = getRaceCourseMapModel({
    course: raceCard.course,
    distance: raceCard.distance,
    racecourse: raceCard.racecourse,
    racecourseCode: raceCard.racecourseCode,
    surface: raceCard.surface,
  });
  const trackPath =
    map.trackShape === "happy-valley"
      ? "M62 91 C45 72 48 42 78 28 H166 C206 28 230 50 226 80 C222 108 196 122 153 119 H91 C78 119 68 109 62 91 Z"
      : "M45 91 C35 64 47 34 84 31 H179 C214 31 232 51 228 79 C224 107 198 119 157 116 H76 C60 116 50 106 45 91 Z";

  return (
    <div className="race-map" aria-label={`${map.racecourseLabel} ${map.distanceLabel} course map`}>
      <svg className="race-map-svg" viewBox="0 0 260 134" role="img">
        <title>{`${map.racecourseLabel} ${map.distanceLabel}`}</title>
        <path className="race-map-infield" d={trackPath} />
        <path className="race-map-track" d={trackPath} />
        {map.showStraight ? (
          <>
            <line className="race-map-straight" x1="48" x2="224" y1="94" y2="94" />
            <path className="race-map-arrow" d="M128 108 H68 M76 101 L68 108 L76 115" />
          </>
        ) : (
          <path className="race-map-arrow" d="M121 111 H72 M80 104 L72 111 L80 118" />
        )}
        <line className="race-map-start-line" x1={map.start.x} x2={map.start.x} y1={map.start.y - 22} y2={map.start.y + 18} />
        <circle className="race-map-start-dot" cx={map.start.x} cy={map.start.y} r="10" />
        <text className="race-map-start-text" x={map.start.x} y={map.start.y + 4}>
          S
        </text>
        <line className="race-map-finish-line" x1={map.finish.x} x2={map.finish.x} y1="76" y2="114" />
        <path className="race-map-flag" d={`M${map.finish.x} 76 h14 l-4 5 4 5 h-14 Z`} />
        <text className="race-map-distance" x="188" y="110">
          {map.distanceLabel}
        </text>
      </svg>
    </div>
  );
}
