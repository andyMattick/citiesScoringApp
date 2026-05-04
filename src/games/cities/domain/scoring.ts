import type { EndGameScoreInput, FinalScore } from "./types";
import {
  validateAchievementPoints,
  validateBoardPoints,
  validateMonumentPoints,
  validateParkPoints,
  validateScoringBoards,
  validateWaterPoints
} from "./validation";

export function computeFinalScore(input: EndGameScoreInput): number {
  validateAchievementPoints(input.achievementPoints);
  validateWaterPoints(input.waterPoints);
  validateParkPoints(input.parkPoints);
  validateMonumentPoints(input.monumentPoints);
  validateScoringBoards(input.scoringBoards);
  input.scoringBoards.forEach((points) => validateBoardPoints(points));

  const scoringBoardTotal = input.scoringBoards.reduce((sum, points) => sum + points, 0);

  return (
    input.achievementPoints +
    input.waterPoints +
    input.parkPoints +
    input.monumentPoints +
    scoringBoardTotal
  );
}

export function buildFinalScore(input: EndGameScoreInput): FinalScore {
  return {
    breakdown: input,
    total: computeFinalScore(input)
  };
}