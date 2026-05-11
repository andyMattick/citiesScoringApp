import type { GameHistorian } from '../../app/gameRegistry';
import { loadGamePlayerStats } from '../../app/gamePlayerStats';

export interface FiveTribesHistoryEntry {
  id: string;
  playedAt: string;
  players: string[];
  scores: Array<{ name: string; total: number; place: number }>;
  winnerNames: string[];
  winnerTotal: number;
}

export const FIVE_TRIBES_STORAGE_KEY = 'five-tribes-history-v1';

export const FiveTribesHistorian: GameHistorian = {
  id: 'five-tribes',
  name: 'Five Tribes',
  storageKey: FIVE_TRIBES_STORAGE_KEY,

  loadHistory: (): FiveTribesHistoryEntry[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(FIVE_TRIBES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getPlayerStats: (playerName: string, history: FiveTribesHistoryEntry[]) => {
    const storedStats = loadGamePlayerStats('five-tribes')[playerName];
    const playerGames = storedStats
      ? storedStats.gamesPlayed
      : history.filter((g) => g.players.includes(playerName)).length;
    const wins = storedStats
      ? storedStats.wins
      : history.filter((g) => g.winnerNames.includes(playerName)).length;
    const losses = storedStats ? storedStats.losses : playerGames - wins;

    const totalScore = storedStats?.numericStats.totalScore ?? history.reduce((sum, g) => {
      const entry = g.scores.find((s) => s.name === playerName);
      return sum + (entry?.total ?? 0);
    }, 0);

    const avgScore = playerGames > 0 ? Math.round(totalScore / playerGames) : 0;

    const bestScore = history.reduce((best, g) => {
      const entry = g.scores.find((s) => s.name === playerName);
      return typeof entry?.total === 'number' ? Math.max(best, entry.total) : best;
    }, 0);

    const firstCount = storedStats?.numericStats.firstCount ?? history.reduce((count, g) => {
      const entry = g.scores.find((s) => s.name === playerName);
      return count + (entry?.place === 1 ? 1 : 0);
    }, 0);

    const secondCount = storedStats?.numericStats.secondCount ?? history.reduce((count, g) => {
      const entry = g.scores.find((s) => s.name === playerName);
      return count + (entry?.place === 2 ? 1 : 0);
    }, 0);

    const thirdCount = storedStats?.numericStats.thirdCount ?? history.reduce((count, g) => {
      const entry = g.scores.find((s) => s.name === playerName);
      return count + (entry?.place === 3 ? 1 : 0);
    }, 0);

    return {
      gamesPlayed: playerGames,
      wins,
      losses,
      stats: {
        'Avg Score':  avgScore,
        'Best Score': bestScore,
        '1st':        firstCount,
        '2nd':        secondCount,
        '3rd':        thirdCount,
        'Win Rate':   playerGames > 0 ? `${Math.round((wins / playerGames) * 100)}%` : '—',
      },
    };
  },

  getPlayerGames: (playerName: string, history: FiveTribesHistoryEntry[]) => {
    return history
      .filter((g) => g.players.includes(playerName))
      .map((g) => {
        const entry = g.scores.find((s) => s.name === playerName);
        const place = entry?.place ?? 0;
        const placeLabel = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
        return {
          date: new Date(g.playedAt).toLocaleDateString(),
          won: g.winnerNames.includes(playerName),
          details: {
            score:  entry?.total ?? '—',
            place:  placeLabel,
            result: g.winnerNames.includes(playerName)
              ? `${placeLabel} (${entry?.total ?? 0} VP)`
              : `${placeLabel} place`,
          },
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
};
