import { describe, expect, it } from "vitest";
import {
  TRACK_EVENT_LIBRARY,
  calculateLongShotScores,
  createDefaultHorses,
  validateRaceResults,
  type LongShotPlayerInput
} from "./logic";

describe("long shot scoring", () => {
  it("validates unique finish positions", () => {
    const horses = createDefaultHorses();
    horses[0].finishPosition = 1;
    horses[1].finishPosition = 1;

    expect(validateRaceResults(horses)).toBe("Only one horse can be assigned to each finishing position.");
  });

  it("calculates payouts, returns, event bonuses, and horse effects", () => {
    const horses = createDefaultHorses();
    horses[0].finishPosition = 1;
    horses[0].card = {
      ...horses[0].card,
      endgameEffectId: "golden_corral",
      effectType: "endgame"
    };
    horses[3].card = {
      ...horses[3].card,
      endgameEffectId: "dance_card",
      effectType: "endgame"
    };
    horses[4].card = {
      ...horses[4].card,
      endgameEffectId: "bottom_dollar",
      effectType: "endgame"
    };
    horses[5].card = {
      ...horses[5].card,
      endgameEffectId: "horse6_partial_gear",
      effectType: "endgame"
    };
    horses[7].finishPosition = 2;

    const players: LongShotPlayerInput[] = [
      {
        name: "Alice",
        cashOnHand: 20,
        bets: [
          { horseId: 1, amount: 3 },
          { horseId: 5, amount: 4 },
          { horseId: 8, amount: 2 }
        ],
        ownedHorseIds: [1, 4, 5, 6],
        helmetJerseySets: [
          { id: "a", chosenJockeyConventionOption: "endgame_7" },
          { id: "b", chosenJockeyConventionOption: "immediate_5" }
        ],
        markedHorseCount: 3,
        partialGearCount: 2
      },
      {
        name: "Bob",
        cashOnHand: 10,
        bets: [],
        ownedHorseIds: [8],
        helmetJerseySets: [],
        markedHorseCount: 0,
        partialGearCount: 0
      }
    ];

    horses[4].crossedNoBetLine = true;

    const result = calculateLongShotScores(players, horses, TRACK_EVENT_LIBRARY[0], {
      helmetJerseySetValue: 5,
      ownerBonusFirst: 8,
      ownerBonusSecond: 4,
      ownerBonusThird: 2
    });

    expect(result.greatAppreciationActive).toBe(true);
    expect(result.jockeyConventionActive).toBe(true);
    expect(result.playerScores).toHaveLength(2);

    const alice = result.playerScores.find((entry) => entry.playerId === "Alice");
    expect(alice).toMatchObject({
      cashOnHand: 20,
      betPayouts: 51,
      betReturns: 4,
      ownerBonuses: 8,
      helmetJerseyBase: 10,
      jockeyConventionBonus: 7,
      horseCardBonuses: 30,
      horseCardPenalties: 0,
      total: 130
    });

    const bob = result.playerScores.find((entry) => entry.playerId === "Bob");
    expect(bob).toMatchObject({
      ownerBonuses: 4,
      total: 14
    });
  });
});