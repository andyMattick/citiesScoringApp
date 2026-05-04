import { describe, expect, it } from "vitest";
import {
  validateAchievementPoints,
  validateBoardPoints,
  validateCardSelection,
  validateCity,
  validateMonumentPoints,
  validateParkPoints,
  validateScoringBoards,
  validateWaterPoints
} from "./validation";

describe("validation", () => {
  it("requires integer board points", () => {
    expect(() => validateBoardPoints(4.5)).toThrow("Board points must be an integer.");
  });

  it("rejects negative board points", () => {
    expect(() => validateBoardPoints(-1)).toThrow("Board points must be greater than or equal to 0.");
  });

  it("rejects board points above 20", () => {
    expect(() => validateBoardPoints(21)).toThrow("Board points must be less than or equal to 20.");
  });

  it("rejects achievement points above 20", () => {
    expect(() => validateAchievementPoints(21)).toThrow(
      "Achievement points must be less than or equal to 20."
    );
  });

  it("rejects negative water, park, and monument points", () => {
    expect(() => validateWaterPoints(-1)).toThrow("Water points must be greater than or equal to 0.");
    expect(() => validateParkPoints(-1)).toThrow("Park points must be greater than or equal to 0.");
    expect(() => validateMonumentPoints(-1)).toThrow(
      "Monument points must be greater than or equal to 0."
    );
  });

  it("requires exactly 8 cards and allows duplicates", () => {
    expect(() => validateCardSelection(["Card 1", "Card 2", "Card 3"]))
      .toThrow("Exactly 8 scoring cards must be selected.");
    expect(() => validateCardSelection(["Card 1", "Card 1", "Card 3", "Card 4", "Card 5", "Card 6", "Card 7", "Card 8"]))
      .not.toThrow();
  });

  it("requires a city", () => {
    expect(() => validateCity("   ")).toThrow("A city must be selected.");
  });

  it("requires exactly 4 scoring boards", () => {
    expect(() => validateScoringBoards([1, 2, 3])).toThrow(
      "Exactly 8 scoring boards must be entered."
    );
  });
});