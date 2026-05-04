import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./reducer";

describe("reducer", () => {
  it("stores the selected city", () => {
    const nextState = reducer(initialState, { type: "SET_CITY", city: "Sydney" });
    expect(nextState.city).toBe("Sydney");
  });

  it("stores the selected cards", () => {
    const nextState = reducer(initialState, {
      type: "SET_SELECTED_CARDS",
      cardIds: ["Card 1", "Card 2", "Card 3", "Card 4", "Card 5", "Card 6", "Card 7", "Card 8"]
    });

    expect(nextState.selectedCardIds).toEqual(["Card 1", "Card 2", "Card 3", "Card 4", "Card 5", "Card 6", "Card 7", "Card 8"]);
    expect(nextState.endGame.scoringBoards).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("updates scoring board points", () => {
    const seededState = reducer(initialState, {
      type: "SET_SELECTED_CARDS",
      cardIds: ["Card 1", "Card 2", "Card 3", "Card 4", "Card 5", "Card 6", "Card 7", "Card 8"]
    });

    const nextState = reducer(seededState, { type: "SET_BOARD_POINTS", boardIndex: 1, points: 7 });
    expect(nextState.endGame.scoringBoards[1]).toBe(7);
  });

  it("updates achievement points", () => {
    const nextState = reducer(initialState, { type: "SET_ACHIEVEMENT_POINTS", points: 6 });
    expect(nextState.endGame.achievementPoints).toBe(6);
  });

  it("updates water, park, and monument points", () => {
    const withWater = reducer(initialState, { type: "SET_WATER_POINTS", points: 10 });
    const withPark = reducer(withWater, { type: "SET_PARK_POINTS", points: 6 });
    const withMonuments = reducer(withPark, { type: "SET_MONUMENT_POINTS", points: 4 });

    expect(withMonuments.endGame.waterPoints).toBe(10);
    expect(withMonuments.endGame.parkPoints).toBe(6);
    expect(withMonuments.endGame.monumentPoints).toBe(4);
  });

  it("finalizes the score", () => {
    const withCity = reducer(initialState, { type: "SET_CITY", city: "Sydney" });
    const withCards = reducer(withCity, {
      type: "SET_SELECTED_CARDS",
      cardIds: ["Card 1", "Card 2", "Card 3", "Card 4", "Card 5", "Card 6", "Card 7", "Card 8"]
    });
    const withPoints = reducer(reducer(withCards, { type: "SET_BOARD_POINTS", boardIndex: 0, points: 6 }), {
      type: "SET_BOARD_POINTS",
      boardIndex: 1,
      points: 4
    });
    const morePoints = reducer(reducer(withPoints, { type: "SET_BOARD_POINTS", boardIndex: 2, points: 3 }), {
      type: "SET_BOARD_POINTS",
      boardIndex: 3,
      points: 2
    });
    const extraPoints = reducer(reducer(morePoints, { type: "SET_BOARD_POINTS", boardIndex: 4, points: 1 }), {
      type: "SET_BOARD_POINTS",
      boardIndex: 5,
      points: 1
    });
    const finalBoardPoints = reducer(reducer(extraPoints, { type: "SET_BOARD_POINTS", boardIndex: 6, points: 1 }), {
      type: "SET_BOARD_POINTS",
      boardIndex: 7,
      points: 1
    });
    const withAchievement = reducer(finalBoardPoints, { type: "SET_ACHIEVEMENT_POINTS", points: 5 });
    const withWater = reducer(withAchievement, { type: "SET_WATER_POINTS", points: 10 });
    const withPark = reducer(withWater, { type: "SET_PARK_POINTS", points: 6 });
    const withMonuments = reducer(withPark, { type: "SET_MONUMENT_POINTS", points: 4 });
    const nextState = reducer(withMonuments, { type: "FINALIZE" });

    expect(nextState.finalScore?.total).toBe(44);
  });
});