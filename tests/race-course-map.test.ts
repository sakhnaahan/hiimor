import assert from "node:assert/strict";
import test from "node:test";
import { getRaceCourseMapModel } from "@/lib/race-course-map";

test("Sha Tin short turf races use the straight-course map", () => {
  const map = getRaceCourseMapModel({
    course: '"C" Course',
    distance: "1000M",
    racecourse: "Sha Tin",
    racecourseCode: "ST",
    surface: "Turf",
  });

  assert.equal(map.trackShape, "sha-tin");
  assert.equal(map.showStraight, true);
  assert.equal(map.distanceLabel, "1000M");
  assert.equal(map.courseLabel, '"C" Course');
});

test("Happy Valley races use the Happy Valley map shape", () => {
  const map = getRaceCourseMapModel({
    course: '"A" Course',
    distance: "1650M",
    racecourse: "Happy Valley",
    racecourseCode: "HV",
    surface: "Turf",
  });

  assert.equal(map.trackShape, "happy-valley");
  assert.equal(map.showStraight, false);
  assert.equal(map.racecourseLabel, "Happy Valley");
});

test("missing map labels degrade gracefully", () => {
  const map = getRaceCourseMapModel({
    course: "",
    distance: "",
    racecourse: "",
    racecourseCode: "",
    surface: "",
  });

  assert.equal(map.distanceLabel, "Distance TBC");
  assert.equal(map.courseLabel, "Course TBC");
  assert.equal(map.surfaceLabel, "Surface TBC");
});
