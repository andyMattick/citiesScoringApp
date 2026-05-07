export type FinishPosition = 1 | 2 | 3;

export type EndgameHorseEffectId =
  | "golden_corral"
  | "pie_in_the_sky"
  | "flex_your_quads"
  | "dance_card"
  | "marks_the_spot"
  | "bottom_dollar"
  | "laundry_day"
  | "horse6_partial_gear"
  | "great_appreciation";

export type JockeyConventionChoice = "immediate_5" | "endgame_7";

export interface PlayerBet {
  horseId: number;
  amount: number;
}

export interface HelmetJerseySet {
  id: string;
  chosenJockeyConventionOption?: JockeyConventionChoice;
}

export interface HorseCard {
  id: string;
  horseId: number;
  name: string;
  effectType: "none" | "endgame";
  endgameEffectId?: EndgameHorseEffectId;
  description: string;
}

export interface HorseState {
  id: number;
  name: string;
  group: 1 | 2 | 3 | 4;
  finishPosition: FinishPosition | null;
  crossedNoBetLine: boolean;
  card: HorseCard;
}

export interface TrackEvent {
  id: string;
  name: string;
  description: string;
  hasEndgameEffect: boolean;
  endgameEffectId?: "jockey_convention";
}

export interface LongShotPlayerInput {
  name: string;
  cashOnHand: number;
  bets: PlayerBet[];
  ownedHorseIds: number[];
  helmetJerseySets: HelmetJerseySet[];
  markedHorseCount: number;
  partialGearCount: number;
}

export interface LongShotScoringConfig {
  helmetJerseySetValue: number;
  ownerBonusFirst: number;
  ownerBonusSecond: number;
  ownerBonusThird: number;
}

export interface HorseEffectContribution {
  effectId: EndgameHorseEffectId;
  amount: number;
}

export interface PlayerScoreBreakdown {
  playerId: string;
  cashOnHand: number;
  betPayouts: number;
  betReturns: number;
  ownerBonuses: number;
  helmetJerseyBase: number;
  jockeyConventionBonus: number;
  horseCardBonuses: number;
  horseCardPenalties: number;
  horseEffects: HorseEffectContribution[];
  total: number;
}

export interface LongShotScoringResult {
  greatAppreciationActive: boolean;
  jockeyConventionActive: boolean;
  playerScores: PlayerScoreBreakdown[];
}

const HORSE_NAMES = [
  "Hoof Hustle",
  "Silver Streak",
  "Velvet Dash",
  "Night Thunder",
  "Pocket Rocket",
  "Lucky Lantern",
  "Backstretch Belle",
  "Great Appreciation"
] as const;

export const MOVEMENT_DIE_FACES = [1, 2, 2, 2, 3, 3] as const;

export const TRACK_EVENT_LIBRARY: TrackEvent[] = [
  {
    id: "jockey-convention",
    name: "Jockey Convention",
    description: "Each completed helmet and jersey set may score +7 at endgame instead of the in-race $5 option.",
    hasEndgameEffect: true,
    endgameEffectId: "jockey_convention"
  },
  {
    id: "regular-race-day",
    name: "Regular Race Day",
    description: "No additional endgame effect. Use the roller and score the table as normal.",
    hasEndgameEffect: false
  },
  {
    id: "sunny-rail",
    name: "Sunny Rail",
    description: "A calm table reminder only. No endgame modifier is applied in the app.",
    hasEndgameEffect: false
  }
];

export const HORSE_CARD_OPTIONS_BY_HORSE: Record<number, HorseCard[]> = {
  1: [
    {
      id: "horse-1-golden-corral",
      horseId: 1,
      name: "Golden Corral",
      effectType: "endgame",
      endgameEffectId: "golden_corral",
      description: "Owner scores +10 if they own 3 or more horses."
    },
    {
      id: "horse-1-none",
      horseId: 1,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  2: [
    {
      id: "horse-2-pie-in-the-sky",
      horseId: 2,
      name: "Pie in the Sky",
      effectType: "endgame",
      endgameEffectId: "pie_in_the_sky",
      description: "Owner loses 10 if horse 2 does not finish."
    },
    {
      id: "horse-2-none",
      horseId: 2,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  3: [
    {
      id: "horse-3-none",
      horseId: 3,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  4: [
    {
      id: "horse-4-flex-your-quads",
      horseId: 4,
      name: "Flex Your Quads",
      effectType: "endgame",
      endgameEffectId: "flex_your_quads",
      description: "Owner loses 4 for each bet they placed on an unfinished horse."
    },
    {
      id: "horse-4-dance-card",
      horseId: 4,
      name: "Dance Card",
      effectType: "endgame",
      endgameEffectId: "dance_card",
      description: "Owner scores 4 per marked horse on the card."
    },
    {
      id: "horse-4-none",
      horseId: 4,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  5: [
    {
      id: "horse-5-marks-the-spot",
      horseId: 5,
      name: "Marks the Spot",
      effectType: "endgame",
      endgameEffectId: "marks_the_spot",
      description: "Owner scores 1 per marked horse on the card."
    },
    {
      id: "horse-5-bottom-dollar",
      horseId: 5,
      name: "Bottom Dollar",
      effectType: "endgame",
      endgameEffectId: "bottom_dollar",
      description: "Owner gains the amount of each returned no-bet-line bet they placed."
    },
    {
      id: "horse-5-laundry-day",
      horseId: 5,
      name: "Laundry Day",
      effectType: "endgame",
      endgameEffectId: "laundry_day",
      description: "Owner scores +10 if they have no completed helmet and jersey sets."
    },
    {
      id: "horse-5-none",
      horseId: 5,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  6: [
    {
      id: "horse-6-partial-gear",
      horseId: 6,
      name: "Partial Gear",
      effectType: "endgame",
      endgameEffectId: "horse6_partial_gear",
      description: "Owner scores 2 for each horse where they have only a jersey or only a helmet."
    },
    {
      id: "horse-6-none",
      horseId: 6,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  7: [
    {
      id: "horse-7-none",
      horseId: 7,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ],
  8: [
    {
      id: "horse-8-great-appreciation",
      horseId: 8,
      name: "Great Appreciation",
      effectType: "endgame",
      endgameEffectId: "great_appreciation",
      description: "If horse 8 finishes, add 10 to its bet payout multiplier."
    },
    {
      id: "horse-8-none",
      horseId: 8,
      name: "No endgame effect",
      effectType: "none",
      description: "No app-tracked endgame effect."
    }
  ]
};

function getDefaultCardForHorse(horseId: number): HorseCard {
  return HORSE_CARD_OPTIONS_BY_HORSE[horseId][0];
}

export function createDefaultHorses(): HorseState[] {
  return Array.from({ length: 8 }, (_, index) => {
    const id = index + 1;
    const group = id <= 2 ? 1 : id <= 4 ? 2 : id <= 6 ? 3 : 4;

    return {
      id,
      name: HORSE_NAMES[index],
      group,
      finishPosition: null,
      crossedNoBetLine: false,
      card: getDefaultCardForHorse(id)
    };
  });
}

export function getPayoutMultiplier(horseId: number, finishPosition: FinishPosition): number {
  const group = horseId <= 2 ? 1 : horseId <= 4 ? 2 : horseId <= 6 ? 3 : 4;

  if (group === 1) {
    return finishPosition === 1 ? 5 : finishPosition === 2 ? 4 : 3;
  }

  if (group === 2) {
    return finishPosition === 1 ? 6 : finishPosition === 2 ? 5 : 4;
  }

  if (group === 3) {
    return finishPosition === 1 ? 7 : finishPosition === 2 ? 6 : 5;
  }

  return finishPosition === 1 ? 9 : finishPosition === 2 ? 8 : 7;
}

export function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollMovementDie(): (typeof MOVEMENT_DIE_FACES)[number] {
  return randomItem(MOVEMENT_DIE_FACES);
}

export function rollHorseDie(): number {
  return Math.floor(Math.random() * 8) + 1;
}

export function validateRaceResults(horses: HorseState[]): string | null {
  const positions = horses
    .map((horse) => horse.finishPosition)
    .filter((value): value is FinishPosition => value !== null);
  const uniquePositions = new Set(positions);

  if (positions.length !== uniquePositions.size) {
    return "Only one horse can be assigned to each finishing position.";
  }

  return null;
}

function ownsHorse(player: LongShotPlayerInput, horseId: number): boolean {
  return player.ownedHorseIds.includes(horseId);
}

function pushEffect(effects: HorseEffectContribution[], effectId: EndgameHorseEffectId, amount: number) {
  if (amount === 0) {
    return;
  }

  effects.push({ effectId, amount });
}

export function calculateLongShotScores(
  players: LongShotPlayerInput[],
  horses: HorseState[],
  trackEvent: TrackEvent,
  config: LongShotScoringConfig
): LongShotScoringResult {
  const horseMap = new Map(horses.map((horse) => [horse.id, horse]));
  const greatAppreciationActive =
    horseMap.get(8)?.finishPosition !== null && horseMap.get(8)?.card.endgameEffectId === "great_appreciation";
  const jockeyConventionActive = trackEvent.endgameEffectId === "jockey_convention";

  const playerScores = players.map((player) => {
    let betPayouts = 0;
    let betReturns = 0;
    let ownerBonuses = 0;
    const helmetJerseyBase = player.helmetJerseySets.length * config.helmetJerseySetValue;
    let jockeyConventionBonus = 0;
    let horseCardBonuses = 0;
    let horseCardPenalties = 0;
    const horseEffects: HorseEffectContribution[] = [];

    for (const bet of player.bets) {
      const horse = horseMap.get(bet.horseId);
      if (!horse || bet.amount <= 0) {
        continue;
      }

      if (horse.finishPosition !== null) {
        let multiplier = getPayoutMultiplier(horse.id, horse.finishPosition);
        if (greatAppreciationActive && horse.id === 8) {
          multiplier += 10;
        }
        betPayouts += bet.amount * multiplier;
        continue;
      }

      if (horse.crossedNoBetLine) {
        betReturns += bet.amount;
      }
    }

    if (jockeyConventionActive) {
      jockeyConventionBonus = player.helmetJerseySets.reduce((sum, set) => {
        return sum + (set.chosenJockeyConventionOption === "endgame_7" ? 7 : 0);
      }, 0);
    }

    for (const horse of horses) {
      const effectId = horse.card.endgameEffectId;
      if (!effectId) {
        continue;
      }

      if (effectId === "great_appreciation") {
        continue;
      }

      if (!ownsHorse(player, horse.id)) {
        continue;
      }

      if (effectId === "golden_corral") {
        const bonus = player.ownedHorseIds.length >= 3 ? 10 : 0;
        horseCardBonuses += bonus;
        pushEffect(horseEffects, effectId, bonus);
        continue;
      }

      if (effectId === "pie_in_the_sky") {
        const penalty = horse.finishPosition === null ? 10 : 0;
        horseCardPenalties += penalty;
        pushEffect(horseEffects, effectId, -penalty);
        continue;
      }

      if (effectId === "flex_your_quads") {
        const unfinishedBetCount = player.bets.filter((bet) => horseMap.get(bet.horseId)?.finishPosition === null).length;
        const penalty = unfinishedBetCount * 4;
        horseCardPenalties += penalty;
        pushEffect(horseEffects, effectId, -penalty);
        continue;
      }

      if (effectId === "dance_card") {
        const bonus = player.markedHorseCount * 4;
        horseCardBonuses += bonus;
        pushEffect(horseEffects, effectId, bonus);
        continue;
      }

      if (effectId === "marks_the_spot") {
        const bonus = player.markedHorseCount;
        horseCardBonuses += bonus;
        pushEffect(horseEffects, effectId, bonus);
        continue;
      }

      if (effectId === "bottom_dollar") {
        const bonus = player.bets.reduce((sum, bet) => {
          const betHorse = horseMap.get(bet.horseId);
          if (!betHorse || betHorse.finishPosition !== null || !betHorse.crossedNoBetLine) {
            return sum;
          }
          return sum + Math.max(0, bet.amount);
        }, 0);
        horseCardBonuses += bonus;
        pushEffect(horseEffects, effectId, bonus);
        continue;
      }

      if (effectId === "laundry_day") {
        const bonus = player.helmetJerseySets.length === 0 ? 10 : 0;
        horseCardBonuses += bonus;
        pushEffect(horseEffects, effectId, bonus);
        continue;
      }

      if (effectId === "horse6_partial_gear") {
        const bonus = player.partialGearCount * 2;
        horseCardBonuses += bonus;
        pushEffect(horseEffects, effectId, bonus);
      }
    }

    for (const horse of horses) {
      if (!ownsHorse(player, horse.id) || horse.finishPosition === null) {
        continue;
      }

      if (horse.finishPosition === 1) {
        ownerBonuses += config.ownerBonusFirst;
      } else if (horse.finishPosition === 2) {
        ownerBonuses += config.ownerBonusSecond;
      } else {
        ownerBonuses += config.ownerBonusThird;
      }
    }

    return {
      playerId: player.name,
      cashOnHand: player.cashOnHand,
      betPayouts,
      betReturns,
      ownerBonuses,
      helmetJerseyBase,
      jockeyConventionBonus,
      horseCardBonuses,
      horseCardPenalties,
      horseEffects,
      total:
        player.cashOnHand +
        betPayouts +
        betReturns +
        ownerBonuses +
        helmetJerseyBase +
        jockeyConventionBonus +
        horseCardBonuses -
        horseCardPenalties
    };
  });

  return {
    greatAppreciationActive,
    jockeyConventionActive,
    playerScores
  };
}