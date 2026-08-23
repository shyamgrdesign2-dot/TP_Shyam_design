import moment from "moment";
import {
  getFinitePointPixels,
  getGrowthChartData,
} from "./growthChartHelper";

// Chart.js linear scales resolve a pixel arithmetically, so a value that is
// undefined or non-numeric becomes NaN while null coerces to 0. This mock
// keeps that coercion behaviour rather than second-guessing it.
const scale = (scaleFactor) => ({
  getPixelForValue: (value) => value * scaleFactor,
});

const xAxis = scale(2);
const yAxis = scale(3);

describe("getFinitePointPixels", () => {
  it("resolves pixel positions for readings that have both values", () => {
    const point = { x: 10, y: 20, isMalnutrition: true };

    expect(getFinitePointPixels([point], xAxis, yAxis)).toEqual([
      { point, x: 20, y: 60 },
    ]);
  });

  it("drops readings whose age could not be derived from the date of birth", () => {
    // A patient with a missing or unparseable DOB makes moment().diff() return
    // NaN, so every point on the age-based charts loses its x. This is the
    // shape that was throwing from createRadialGradient in production.
    const data = [
      { x: NaN, y: 12 },
      { x: NaN, y: 14, isMalnutrition: true },
    ];

    expect(getFinitePointPixels(data, xAxis, yAxis)).toEqual([]);
  });

  it("drops a reading that is missing the measurement plotted on an axis", () => {
    // Height vs Weight plots height on x, so a reading saved without a height
    // has no x value at all.
    const complete = { x: 120, y: 25 };
    const noHeight = { x: undefined, y: 25, isMalnutrition: true };

    const points = getFinitePointPixels([complete, noHeight], xAxis, yAxis);

    expect(points).toHaveLength(1);
    expect(points[0].point).toBe(complete);
  });

  it("drops infinite values as well as NaN", () => {
    const data = [
      { x: Infinity, y: 10 },
      { x: 5, y: -Infinity },
    ];

    expect(getFinitePointPixels(data, xAxis, yAxis)).toEqual([]);
  });

  it("keeps readings Chart.js itself would plot at zero", () => {
    // null coerces to 0 on a linear scale, so the point is still drawable and
    // this helper must not start hiding points the chart used to show.
    const atZero = { x: null, y: 30 };

    expect(getFinitePointPixels([atZero], xAxis, yAxis)).toEqual([
      { point: atZero, x: 0, y: 90 },
    ]);
  });

  it("tolerates a missing data array", () => {
    expect(getFinitePointPixels(undefined, xAxis, yAxis)).toEqual([]);
  });
});

describe("getGrowthChartData malnutrition flag", () => {
  const DOB = moment("2020-01-01");

  // tcbc_created_date drives the age filter, so these span either side of the
  // 24-month cutoff that applies to a patient aged 24 months or older.
  const reading = (date, height) => ({
    tcbc_created_date: date,
    height,
    weight: height / 2,
    bmi: 15,
    ofc: 40,
  });

  it("compares against the previous reading that survived the age filter", () => {
    // The 12-month reading is dropped for a 30-month-old patient, so the
    // 26-month reading is the first one plotted and has nothing to compare
    // against. Before the fix it was compared against the dropped row, and
    // 80 > 60 flagged the very first point on the chart. The 28-month reading
    // must then compare against the 26-month one.
    //
    // Only the first kept reading can have a dropped predecessor, because the
    // age filter drops a prefix of the date-sorted source, so this is the case
    // that distinguishes the fix.
    const rows = [
      reading("2021-01-01", 60), // 12 months - filtered out
      reading("2022-03-01", 80), // 26 months - first kept
      reading("2022-05-01", 90), // 28 months - taller than the kept one
    ];

    const { Height } = getGrowthChartData(rows, DOB, 30);

    expect(Height).toHaveLength(2);
    expect(Height[0].isMalnutrition).toBe(false);
    expect(Height[1].isMalnutrition).toBe(true);
  });

  it("flags each series against its own previous reading", () => {
    const rows = [reading("2022-03-01", 80), reading("2022-05-01", 90)];

    const data = getGrowthChartData(rows, DOB, 30);

    expect(data.Weight[1].isMalnutrition).toBe(true);
    expect(data.HeightVsWeight[1].isMalnutrition).toBe(true);
    // bmi and ofc are unchanged between the two readings, so neither rises.
    expect(data.BMI[1].isMalnutrition).toBe(false);
    expect(data.OFC[1].isMalnutrition).toBe(false);
  });
});
