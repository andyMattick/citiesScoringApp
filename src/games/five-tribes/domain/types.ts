export type FiveTribesScoringCategory =
  | 'gold'
  | 'viziers'
  | 'elders'
  | 'djinns'
  | 'tiles'
  | 'palm_trees'
  | 'palaces'
  | 'merchandise';

export const SCORING_CATEGORY_ORDER: FiveTribesScoringCategory[] = [
  'gold',
  'viziers',
  'elders',
  'djinns',
  'tiles',
  'palm_trees',
  'palaces',
  'merchandise',
];

export const SCORING_CATEGORY_LABELS: Record<FiveTribesScoringCategory, string> = {
  gold: 'Gold Coins',
  viziers: 'Viziers (Yellow Meeples)',
  elders: 'Elders (White Meeples)',
  djinns: 'Djinns',
  tiles: 'Tile VP',
  palm_trees: 'Palm Trees',
  palaces: 'Palaces',
  merchandise: 'Merchandise',
};

export interface FiveTribesPlayerScoring {
  // Raw inputs
  goldCoins: number;
  viziersCount: number;
  eldersCount: number;
  djinnIds: string[];
  tileVpSum: number;
  palmTreeCount: number;
  palaceCount: number;
  uniqueMerchSuits: number;

  // Derived VP
  vpGold: number;
  vpViziers: number;
  vpElders: number;
  vpDjinns: number;
  vpTiles: number;
  vpPalmTrees: number;
  vpPalaces: number;
  vpMerchandise: number;

  totalVp: number;
}

export interface FiveTribesPlayer {
  id: string;
  name: string;
  scoring: FiveTribesPlayerScoring;
}

export function emptyPlayerScoring(): FiveTribesPlayerScoring {
  return {
    goldCoins: 0,
    viziersCount: 0,
    eldersCount: 0,
    djinnIds: [],
    tileVpSum: 0,
    palmTreeCount: 0,
    palaceCount: 0,
    uniqueMerchSuits: 0,
    vpGold: 0,
    vpViziers: 0,
    vpElders: 0,
    vpDjinns: 0,
    vpTiles: 0,
    vpPalmTrees: 0,
    vpPalaces: 0,
    vpMerchandise: 0,
    totalVp: 0,
  };
}

// BID_TRACK_COSTS[i] = cost to sit in position i (0 = first, 5 = last)
export const BID_TRACK_COSTS = [0, 1, 3, 5, 8, 12] as const;
