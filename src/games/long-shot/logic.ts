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

const HORSE_NAMES = ["Horse 1", "Horse 2", "Horse 3", "Horse 4", "Horse 5", "Horse 6", "Horse 7", "Horse 8"] as const;

export const MOVEMENT_DIE_FACES = [1, 2, 2, 2, 3, 3] as const;

export const TRACK_EVENT_LIBRARY: TrackEvent[] = [
  {
    id: "jockey-convention",
    name: "Jockey Convention",
    description: "When completing a set, gain $5 immediately or circle the set and gain $7 at scoring.",
    hasEndgameEffect: true,
    endgameEffectId: "jockey_convention"
  },
  {
    id: "muddy-tracks",
    name: "Muddy Tracks",
    description: "Movement restriction event. No endgame scoring effect is applied in the app.",
    hasEndgameEffect: false
  },
  {
    id: "lucky-number",
    name: "Lucky Number",
    description: "Gain $1 when horse die matches chosen number. No endgame scoring effect is applied in the app.",
    hasEndgameEffect: false
  },
  {
    id: "the-comeback-kid",
    name: "The Comeback Kid",
    description: "Last-place horse moves +1. No endgame scoring effect is applied in the app.",
    hasEndgameEffect: false
  },
  {
    id: "off-the-menu",
    name: "Off the Menu",
    description: "Remove -2/-2 and -3 concession bonuses. No endgame scoring effect is applied in the app.",
    hasEndgameEffect: false
  },
  {
    id: "bank-grand-opening",
    name: "Bank Grand Opening",
    description: "Alternate action: gain cash equal to the movement die. No endgame scoring effect is applied in the app.",
    hasEndgameEffect: false
  },
  {
    id: "narrow-track",
    name: "Narrow Track",
    description: "If ending on a 2-horse space, move +1. No endgame scoring effect is applied in the app.",
    hasEndgameEffect: false
  },
  {
    id: "new-concession",
    name: "New Concession",
    description: "Concessions can be marked on the event card. No endgame scoring effect is applied in the app.",
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
      id: "horse-1-chain-reaction",
      horseId: 1,
      name: "Chain Reaction",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-1-bettor-butter",
      horseId: 1,
      name: "Bettor Butter",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-1-rocket-boots",
      horseId: 1,
      name: "Rocket Boots",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-1-row-your-boat",
      horseId: 1,
      name: "Row your Boat",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-1-strung-along",
      horseId: 1,
      name: "Strung Along",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-1-out-of-alignment",
      horseId: 1,
      name: "Out of Alignment",
      effectType: "none",
      description: "No endgame scoring effect."
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
      id: "horse-2-dollar-menu",
      horseId: 2,
      name: "Dollar Menu",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-2-lemonade-stan",
      horseId: 2,
      name: "Lemonade Stan",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-2-silver-spoon",
      horseId: 2,
      name: "Silver Spoon",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-2-make-it-rain",
      horseId: 2,
      name: "Make it Rain",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-2-too-lucky",
      horseId: 2,
      name: "Too Lucky",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-2-favorite-snack",
      horseId: 2,
      name: "Favorite Snack",
      effectType: "none",
      description: "No endgame scoring effect."
    }
  ],
  3: [
    {
      id: "horse-3-spur-of-the-moment",
      horseId: 3,
      name: "Spur of the Moment",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-3-scatter-shot",
      horseId: 3,
      name: "Scatter Shot",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-3-cook-the-books",
      horseId: 3,
      name: "Cook the Books",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-3-receding-mare-line",
      horseId: 3,
      name: "Receding Mare Line",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-3-triple-scoop",
      horseId: 3,
      name: "Triple Scoop",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-3-show-me-the-money",
      horseId: 3,
      name: "Show Me the Money",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-3-pay-it-forward",
      horseId: 3,
      name: "Pay it Forward",
      effectType: "none",
      description: "No endgame scoring effect."
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
      id: "horse-4-double-crosser",
      horseId: 4,
      name: "Double Crosser",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-4-three-four-five",
      horseId: 4,
      name: "Three Four Five",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-4-into-thin-air",
      horseId: 4,
      name: "Into Thin Air",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-4-early-bird-special",
      horseId: 4,
      name: "Early Bird Special",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-4-mint-condition",
      horseId: 4,
      name: "Mint Condition",
      effectType: "none",
      description: "No endgame scoring effect."
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
      id: "horse-5-five-leaf-clover",
      horseId: 5,
      name: "Five Leaf Clover",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-5-charley-horse",
      horseId: 5,
      name: "Charley Horse",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-5-the-sting",
      horseId: 5,
      name: "The Sting",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-5-fancy-hat",
      horseId: 5,
      name: "Fancy Hat",
      effectType: "none",
      description: "No endgame scoring effect."
    }
  ],
  6: [
    {
      id: "horse-6-partial-gear",
      horseId: 6,
      name: "Unnamed #6 Effect",
      effectType: "endgame",
      endgameEffectId: "horse6_partial_gear",
      description: "Owner scores 2 for each horse where they have only a jersey or only a helmet."
    },
    {
      id: "horse-6-equestrian-inception",
      horseId: 6,
      name: "Equestrian Inception",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-6-photo-finish",
      horseId: 6,
      name: "Photo Finish",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-6-miracle-worker",
      horseId: 6,
      name: "Miracle Worker",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-6-dirty-laundry",
      horseId: 6,
      name: "Dirty Laundry",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-6-partner-in-crime",
      horseId: 6,
      name: "Partner in Crime",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-6-night-mare",
      horseId: 6,
      name: "Night Mare",
      effectType: "none",
      description: "No endgame scoring effect."
    }
  ],
  7: [
    {
      id: "horse-7-bettor-safe-than-sorry",
      horseId: 7,
      name: "Bettor Safe than Sorry",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-7-jack-pot",
      horseId: 7,
      name: "Jack Pot",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-7-bread-line",
      horseId: 7,
      name: "Bread Line",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-7-line-your-pockets",
      horseId: 7,
      name: "Line Your Pockets",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-7-cheer-up-buttercup",
      horseId: 7,
      name: "Cheer Up Buttercup",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-7-sticky-fingers",
      horseId: 7,
      name: "Sticky Fingers",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-7-fair-play",
      horseId: 7,
      name: "Fair Play",
      effectType: "none",
      description: "No endgame scoring effect."
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
      id: "horse-8-product-placement",
      horseId: 8,
      name: "Product Placement",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-8-magic-hate-ball",
      horseId: 8,
      name: "Magic Hate Ball",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-8-purple-rein",
      horseId: 8,
      name: "Purple Rein",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-8-nitro-nellie",
      horseId: 8,
      name: "Nitro Nellie",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-8-donut-dollie",
      horseId: 8,
      name: "Donut Dollie",
      effectType: "none",
      description: "No endgame scoring effect."
    },
    {
      id: "horse-8-you-bettor-you-bet",
      horseId: 8,
      name: "You Bettor, You Bet",
      effectType: "none",
      description: "No endgame scoring effect."
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