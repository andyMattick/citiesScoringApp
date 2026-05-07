import type { GameHistorian } from "../../app/gameRegistry";
import { loadGamePlayerStats } from "../../app/gamePlayerStats";

interface LongShotHistoryEntry {
  id: string;
  playedAt: string;
  players: string[];
  scores: Array<{
    name: string;
    total: number;
  }>;
  winnerNames: string[];
  winnerTotal: number;
  trackEventName: string;
  jockeyConventionActive: boolean;
}

const STORAGE_KEY = "long-shot-history-v1";

export const LongShotHistorian: GameHistorian = {
  id: "long-shot",
  name: "Long Shot: The Dice Game",
  storageKey: STORAGE_KEY,

  loadHistory: () => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getPlayerStats: (playerName: string, history: LongShotHistoryEntry[]) => {
    const storedStats = loadGamePlayerStats("long-shot")[playerName];
    const playerGames = storedStats
      ? storedStats.gamesPlayed
      : history.filter((game) => game.players.includes(playerName)).length;
    const wins = storedStats
      ? storedStats.wins
      : history.filter((game) => game.winnerNames.includes(playerName)).length;
    const losses = storedStats ? storedStats.losses : playerGames - wins;
    const totalScore = storedStats?.numericStats.totalScore ?? history.reduce((sum, game) => {
      const score = game.scores.find((entry) => entry.name === playerName)?.total ?? 0;
      return sum + score;
    }, 0);
    const avgScore = playerGames > 0 ? Math.round(totalScore / playerGames) : 0;
    const bestScore = history.reduce((best, game) => {
      const score = game.scores.find((entry) => entry.name === playerName)?.total;
      return typeof score === "number" ? Math.max(best, score) : best;
    }, 0);

    return {
      gamesPlayed: playerGames,
      wins,
      losses,
      stats: {
        "Best Score": bestScore,
        "Avg Score": avgScore,
        "Win Rate": playerGames > 0 ? `${Math.round((wins / playerGames) * 100)}%` : "—"
      }
    };
  },

  getPlayerGames: (playerName: string, history: LongShotHistoryEntry[]) => {
    return history
      .filter((game) => game.players.includes(playerName))
      .map((game) => {
        const won = game.winnerNames.includes(playerName);
        const score = game.scores.find((entry) => entry.name === playerName)?.total ?? 0;
        return {
          date: new Date(game.playedAt).toLocaleDateString(),
          won,
          details: {
            event: game.trackEventName,
            score,
            result: won ? (game.winnerNames.length > 1 ? "Tied for 1st" : "1st place") : "Participated"
          }
        };
      })
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }
};