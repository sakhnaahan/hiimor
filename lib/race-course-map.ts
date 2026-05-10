export type RaceCourseMapModel = {
  distanceLabel: string;
  courseLabel: string;
  racecourseLabel: string;
  surfaceLabel: string;
  trackShape: "sha-tin" | "happy-valley";
  start: { x: number; y: number };
  finish: { x: number; y: number };
  showStraight: boolean;
};

type RaceCourseMapInput = {
  course: string;
  distance: string;
  racecourse: string;
  racecourseCode: string;
  surface: string;
};

function parseDistanceMeters(distance: string) {
  const match = distance.match(/(\d+)\s*M/i);
  if (!match) {
    return null;
  }

  const meters = Number.parseInt(match[1], 10);
  return Number.isFinite(meters) ? meters : null;
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isHappyValley(input: RaceCourseMapInput) {
  return input.racecourseCode.toUpperCase() === "HV" || /happy\s+valley/i.test(input.racecourse);
}

function getStartPosition(distanceMeters: number | null, trackShape: RaceCourseMapModel["trackShape"]) {
  if (trackShape === "sha-tin" && distanceMeters !== null && distanceMeters <= 1200) {
    return { x: 214, y: 94 };
  }

  if (distanceMeters !== null && distanceMeters <= 1400) {
    return trackShape === "happy-valley" ? { x: 76, y: 98 } : { x: 64, y: 102 };
  }

  if (distanceMeters !== null && distanceMeters <= 1800) {
    return trackShape === "happy-valley" ? { x: 184, y: 68 } : { x: 194, y: 58 };
  }

  return trackShape === "happy-valley" ? { x: 142, y: 34 } : { x: 126, y: 28 };
}

export function getRaceCourseMapModel(input: RaceCourseMapInput): RaceCourseMapModel {
  const distanceMeters = parseDistanceMeters(input.distance);
  const trackShape = isHappyValley(input) ? "happy-valley" : "sha-tin";
  const showStraight = trackShape === "sha-tin" && distanceMeters !== null && distanceMeters <= 1200;

  return {
    distanceLabel: normalizeLabel(input.distance) || "Distance TBC",
    courseLabel: normalizeLabel(input.course) || "Course TBC",
    racecourseLabel: normalizeLabel(input.racecourse) || input.racecourseCode || "Racecourse TBC",
    surfaceLabel: normalizeLabel(input.surface) || "Surface TBC",
    trackShape,
    start: getStartPosition(distanceMeters, trackShape),
    finish: { x: 48, y: 94 },
    showStraight,
  };
}
