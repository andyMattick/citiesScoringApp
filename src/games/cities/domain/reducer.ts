import { buildFinalScore } from "./scoring";
import {
  REQUIRED_CARD_COUNT,
  validateAchievementPoints,
  validateBoardPoints,
  validateCardSelection,
  validateCity,
  validateMonumentPoints,
  validateParkPoints,
  validateScoringBoards,
  validateWaterPoints
} from "./validation";
import type { Action, AppState } from "./types";

export const initialState: AppState = {
  city: "",
  selectedCardIds: [],
  endGame: {
    achievementPoints: 0,
    waterPoints: 0,
    parkPoints: 0,
    monumentPoints: 0,
    scoringBoards: Array(REQUIRED_CARD_COUNT).fill(0)
  },
  finalScore: null
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_CITY":
      validateCity(action.city);
      return {
        ...state,
        city: action.city,
        finalScore: null
      };

    case "SET_SELECTED_CARDS":
      validateCardSelection(action.cardIds);
      return {
        ...state,
        selectedCardIds: action.cardIds,
        endGame: {
          ...state.endGame,
          scoringBoards: action.cardIds.map(() => 0)
        },
        finalScore: null
      };

    case "SET_BOARD_POINTS":
      validateBoardPoints(action.points);
      return {
        ...state,
        endGame: {
          ...state.endGame,
          scoringBoards: state.endGame.scoringBoards.map((points, index) =>
            index === action.boardIndex ? action.points : points
          )
        },
        finalScore: null
      };

    case "SET_ACHIEVEMENT_POINTS":
      validateAchievementPoints(action.points);
      return {
        ...state,
        endGame: {
          ...state.endGame,
          achievementPoints: action.points
        },
        finalScore: null
      };

    case "SET_WATER_POINTS":
      validateWaterPoints(action.points);
      return {
        ...state,
        endGame: {
          ...state.endGame,
          waterPoints: action.points
        },
        finalScore: null
      };

    case "SET_PARK_POINTS":
      validateParkPoints(action.points);
      return {
        ...state,
        endGame: {
          ...state.endGame,
          parkPoints: action.points
        },
        finalScore: null
      };

    case "SET_MONUMENT_POINTS":
      validateMonumentPoints(action.points);
      return {
        ...state,
        endGame: {
          ...state.endGame,
          monumentPoints: action.points
        },
        finalScore: null
      };

    case "FINALIZE":
      validateCity(state.city);
      validateCardSelection(state.selectedCardIds);
      validateAchievementPoints(state.endGame.achievementPoints);
      validateWaterPoints(state.endGame.waterPoints);
      validateParkPoints(state.endGame.parkPoints);
      validateMonumentPoints(state.endGame.monumentPoints);
      validateScoringBoards(state.endGame.scoringBoards);
      state.endGame.scoringBoards.forEach((points) => validateBoardPoints(points));
      return {
        ...state,
        finalScore: buildFinalScore(state.endGame)
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}