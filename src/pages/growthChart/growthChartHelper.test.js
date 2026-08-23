import { getFinitePointPixels } from "./growthChartHelper";

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
