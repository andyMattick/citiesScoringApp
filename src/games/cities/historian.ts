import type { GameHistorian } from "../../app/gameRegistry";
import { loadGamePlayerStats } from "../../app/gamePlayerStats";

interface CitiesGame {
  id: string;
  playedAt: string;
  city: string;
  winnerName: string;
  winnerTotal: number;
  playerCount: number;
  players?: string[];
}

export const CitiesHistorian: GameHistorian = {
  id: "cities",
  name: "Cities: Scoring",
  storageKey: "cities-scoring-history-v1",
  
  loadHistory: () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("cities-scoring-history-v1");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  
  getPlayerStats: (playerName: string, history: CitiesGame[]) => {
    const storedStats = loadGamePlayerStats("cities")[playerName];
    const playerGames = storedStats
      ? storedStats.gamesPlayed
      : history.filter((g) => g.players?.includes(playerName) || g.winnerName === playerName).length;
    const wins = storedStats
      ? storedStats.wins
      : history.filter((g) => g.winnerName === playerName).length;
    const losses = storedStats ? storedStats.losses : playerGames - wins;
    const highScore = storedStats?.numericStats.highScore ?? 0;
    const winningScoreCount = storedStats?.numericStats.winningScoreCount ?? 0;
    const winningScoreTotal = storedStats?.numericStats.winningScoreTotal ?? 0;
    const avgScore = winningScoreCount > 0 ? Math.round(winningScoreTotal / winningScoreCount) : 0;
    
    return {
      gamesPlayed: playerGames,
      wins,
      losses,
      stats: {
        "High Score": highScore,
        "Avg Score": avgScore,
        "Win Rate": playerGames > 0 ? `${Math.round((wins / playerGames) * 100)}%` : "—"
      }
    };
  },
  
  getPlayerGames: (playerName: string, history: CitiesGame[]) => {
    return history
      .filter((g) => g.players?.includes(playerName) || g.winnerName === playerName)
      .map((g) => {
        const won = g.winnerName === playerName;
        return {
          date: new Date(g.playedAt).toLocaleDateString(),
          won,
          details: {
            city: g.city,
            score: won ? g.winnerTotal : "—",
            result: won ? `1st place (${g.winnerTotal} pts)` : "Participated"
          }
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};
