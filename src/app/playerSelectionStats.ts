import { loadGamePlayerStats } from "./gamePlayerStats";
import { getGameHistorian } from "./gameRegistry";

export interface PlayerSelectionStatLine {
  gamesPlayed: number;
  wins: number;
}

export function getPlayerSelectionStats(
  gameId: string,
  playerNames: string[]
): Map<string, PlayerSelectionStatLine> {
  const statsMap = new Map<string, PlayerSelectionStatLine>();
  const storedStats = loadGamePlayerStats(gameId);

  for (const playerName of playerNames) {
    const stats = storedStats[playerName];
    if (stats) {
      statsMap.set(playerName, {
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins
      });
    }
  }

  if (playerNames.every((playerName) => statsMap.has(playerName))) {
    return statsMap;
  }

  const historian = getGameHistorian(gameId);

  if (!historian) {
    return statsMap;
  }

  const history = historian.loadHistory();
  for (const playerName of playerNames) {
    if (statsMap.has(playerName)) {
      continue;
    }

    const stats = historian.getPlayerStats(playerName, history);
    statsMap.set(playerName, {
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins
    });
  }

  return statsMap;
}