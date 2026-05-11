import { DJINN_BY_ID } from './data';
import type { FiveTribesPlayer, FiveTribesPlayerScoring } from './types';

const MERCH_VP = [0, 1, 3, 7, 13, 21, 30, 40, 50, 60] as const;

export function computeVpGold(goldCoins: number): number {
  return goldCoins;
}

export function computeVpElders(eldersCount: number): number {
  return eldersCount * 2;
}

export function computeVpDjinns(djinnIds: string[]): number {
  return djinnIds.reduce((sum, id) => sum + (DJINN_BY_ID[id]?.baseVp ?? 0), 0);
}

export function computeVpTiles(tileVpSum: number): number {
  return tileVpSum;
}

export function computeVpPalmTrees(palmTreeCount: number): number {
  return palmTreeCount * 3;
}

export function computeVpPalaces(palaceCount: number): number {
  return palaceCount * 5;
}

export function computeVpMerchandise(uniqueMerchSuits: number): number {
  const clamped = Math.max(0, Math.min(uniqueMerchSuits, MERCH_VP.length - 1));
  return MERCH_VP[clamped];
}

/**
 * Viziers: 1 VP per yellow meeple + 10 VP for each opponent with STRICTLY fewer yellows.
 * Must be computed across all players simultaneously.
 */
export function computeVizierVpForAll(players: FiveTribesPlayer[]): number[] {
  const counts = players.map((p) => p.scoring.viziersCount);
  return counts.map((mine, i) => {
    const bonus = counts.reduce((acc, other, j) => (j !== i && other < mine ? acc + 10 : acc), 0);
    return mine + bonus;
  });
}

export function computeTotalVp(s: FiveTribesPlayerScoring): number {
  return (
    s.vpGold +
    s.vpViziers +
    s.vpElders +
    s.vpDjinns +
    s.vpTiles +
    s.vpPalmTrees +
    s.vpPalaces +
    s.vpMerchandise
  );
}

/**
 * Recompute all derived VP fields for every player.
 * Viziers require cross-player comparison so we do them together.
 */
export function recomputeAllScores(players: FiveTribesPlayer[]): FiveTribesPlayer[] {
  const vizierVps = computeVizierVpForAll(players);

  return players.map((player, i) => {
    const s = player.scoring;
    const updated: FiveTribesPlayerScoring = {
      ...s,
      vpGold:        computeVpGold(s.goldCoins),
      vpViziers:     vizierVps[i],
      vpElders:      computeVpElders(s.eldersCount),
      vpDjinns:      computeVpDjinns(s.djinnIds),
      vpTiles:       computeVpTiles(s.tileVpSum),
      vpPalmTrees:   computeVpPalmTrees(s.palmTreeCount),
      vpPalaces:     computeVpPalaces(s.palaceCount),
      vpMerchandise: computeVpMerchandise(s.uniqueMerchSuits),
    };
    updated.totalVp = computeTotalVp(updated);
    return { ...player, scoring: updated };
  });
}

/** Returns players sorted by totalVp descending, annotated with 1-based place. */
export function rankPlayers(players: FiveTribesPlayer[]): Array<{ player: FiveTribesPlayer; place: number }> {
  const sorted = [...players].sort((a, b) => b.scoring.totalVp - a.scoring.totalVp);
  let place = 1;
  return sorted.map((player, index) => {
    if (index > 0 && player.scoring.totalVp < sorted[index - 1].scoring.totalVp) {
      place = index + 1;
    }
    return { player, place };
  });
}
