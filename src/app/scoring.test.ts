import { describe, expect, it } from "vitest";
import { buildFinalScore, computeFinalScore } from "./scoring";

describe("computeFinalScore", () => {
  it("returns 0 when every bucket is empty", () => {
    expect(
      computeFinalScore({
        achievementPoints: 0,
        waterPoints: 0,
        parkPoints: 0,
        monumentPoints: 0,
        scoringBoards: [0, 0, 0, 0, 0, 0, 0, 0]
      })
    ).toBe(0);
  });

  it("adds scoring board points only", () => {
    expect(
      computeFinalScore({
        achievementPoints: 0,
        waterPoints: 0,
        parkPoints: 0,
        monumentPoints: 0,
        scoringBoards: [6, 4, 3, 2, 1, 1, 1, 1]
      })
    ).toBe(19);
  });

  it("adds achievement points only", () => {
    expect(
      computeFinalScore({
        achievementPoints: 5,
        waterPoints: 0,
        parkPoints: 0,
        monumentPoints: 0,
        scoringBoards: [0, 0, 0, 0, 0, 0, 0, 0]
      })
    ).toBe(5);
  });

  it("adds all five scoring buckets", () => {
    expect(
      computeFinalScore({
        achievementPoints: 5,
        waterPoints: 10,
        parkPoints: 6,
        monumentPoints: 4,
        scoringBoards: [6, 4, 3, 2, 1, 1, 1, 1]
      })
    ).toBe(44);
  });

  it("rejects negative values", () => {
    expect(
      () =>
        computeFinalScore({
          achievementPoints: 0,
          waterPoints: -1,
          parkPoints: 0,
          monumentPoints: 0,
          scoringBoards: [0, 0, 0, 0, 0, 0, 0, 0]
        })
    ).toThrow("Water points must be greater than or equal to 0.");
  });
});

describe("buildFinalScore", () => {
  it("returns the final score object", () => {
    expect(
      buildFinalScore({
        achievementPoints: 5,
        waterPoints: 10,
        parkPoints: 6,
        monumentPoints: 4,
        scoringBoards: [6, 4, 3, 2, 1, 1, 1, 1]
      })
    ).toEqual({
      breakdown: {
        achievementPoints: 5,
        waterPoints: 10,
        parkPoints: 6,
        monumentPoints: 4,
        scoringBoards: [6, 4, 3, 2, 1, 1, 1, 1]
      },
      total: 44
    });
  });
});