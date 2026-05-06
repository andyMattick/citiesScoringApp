export interface ScoringCard {
  id: string;
  name: string;
  city?: string;
  vpValue: number | string;
  perUnit: string;
}

export interface ScoringBoardsInput {
  boardPoints: number[];
}

export interface EndGameScoreInput {
  achievementPoints: number;
  waterPoints: number;
  parkPoints: number;
  monumentPoints: number;
  scoringBoards: number[];
}

export interface FinalScore {
  breakdown: EndGameScoreInput;
  total: number;
}

export interface AppState {
  city: string;
  selectedCardIds: string[];
  endGame: EndGameScoreInput;
  finalScore: FinalScore | null;
}

export type Action =
  | { type: "SET_CITY"; city: string }
  | { type: "SET_SELECTED_CARDS"; cardIds: string[] }
  | { type: "SET_BOARD_POINTS"; boardIndex: number; points: number }
  | { type: "SET_ACHIEVEMENT_POINTS"; points: number }
  | { type: "SET_WATER_POINTS"; points: number }
  | { type: "SET_PARK_POINTS"; points: number }
  | { type: "SET_MONUMENT_POINTS"; points: number }
  | { type: "FINALIZE" }
  | { type: "RESET" };