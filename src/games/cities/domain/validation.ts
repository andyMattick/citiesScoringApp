export const MAX_POINTS = 20;
export const REQUIRED_CARD_COUNT = 8;

function assertInteger(value: number, label: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`);
  }
}

function assertRange(value: number, label: string) {
  if (value < 0) {
    throw new Error(`${label} must be greater than or equal to 0.`);
  }

  if (value > MAX_POINTS) {
    throw new Error(`${label} must be less than or equal to ${MAX_POINTS}.`);
  }
}

export function validateCardSelection(cardIds: string[]): void {
  if (cardIds.length !== REQUIRED_CARD_COUNT) {
    throw new Error(`Exactly ${REQUIRED_CARD_COUNT} scoring cards must be selected.`);
  }

  cardIds.forEach((cardId, index) => {
    if (!cardId.trim()) {
      throw new Error(`Scoring card ${index + 1} is required.`);
    }
  });
}

export function validateBoardPoints(points: number): void {
  assertInteger(points, "Board points");
  assertRange(points, "Board points");
}

export function validateAchievementPoints(points: number): void {
  assertInteger(points, "Achievement points");
  assertRange(points, "Achievement points");
}

export function validateWaterPoints(points: number): void {
  assertInteger(points, "Water points");
  assertRange(points, "Water points");
}

export function validateParkPoints(points: number): void {
  assertInteger(points, "Park points");
  assertRange(points, "Park points");
}

export function validateMonumentPoints(points: number): void {
  assertInteger(points, "Monument points");
  assertRange(points, "Monument points");
}

export function validateScoringBoards(boardPoints: number[]): void {
  if (boardPoints.length !== REQUIRED_CARD_COUNT) {
    throw new Error(`Exactly ${REQUIRED_CARD_COUNT} scoring boards must be entered.`);
  }
}

export function validateCity(city: string): void {
  if (!city.trim()) {
    throw new Error("A city must be selected.");
  }
}