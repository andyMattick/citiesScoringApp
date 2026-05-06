import type { GameHistorian } from "../../app/gameRegistry";
import { loadGamePlayerStats } from "../../app/gamePlayerStats";

interface SecretHitlerGame {
  playedAt: string;
  players: string[];
  liberalTeam: string[];
  fascistTeam: string[];
  winner: "liberal" | "fascist";
  declaredHitler: string;
  liberalPolicies: number;
  fascistPolicies: number;
}

export const SecretHitlerHistorian: GameHistorian = {
  id: "secret-hitler",
  name: "Secret Hitler",
  storageKey: "secret-hitler-history-v1",
  
  loadHistory: () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("secret-hitler-history-v1");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  
  getPlayerStats: (playerName: string, history: SecretHitlerGame[]) => {
    const storedStats = loadGamePlayerStats("secret-hitler")[playerName];
    const playerGames = storedStats
      ? storedStats.gamesPlayed
      : history.filter((g) => g.players.includes(playerName)).length;
    const wins = storedStats
      ? storedStats.wins
      : history.filter((g) => {
          if (!g.players.includes(playerName)) {
            return false;
          }
          const isOnLiberal = g.liberalTeam.includes(playerName);
          return (isOnLiberal && g.winner === "liberal") || (!isOnLiberal && g.winner === "fascist");
        }).length;
    const losses = storedStats ? storedStats.losses : playerGames - wins;
    const hitlerCount = storedStats?.numericStats.hitlerCount ?? history.filter((g) => g.declaredHitler === playerName).length;
    
    return {
      gamesPlayed: playerGames,
      wins,
      losses,
      stats: {
        "Hitler Count": hitlerCount,
        "Win Rate": playerGames > 0 ? `${Math.round((wins / playerGames) * 100)}%` : "—"
      }
    };
  },
  
  getPlayerGames: (playerName: string, history: SecretHitlerGame[]) => {
    return history
      .filter((g) => g.players.includes(playerName))
      .map((g) => {
        const isOnLiberal = g.liberalTeam.includes(playerName);
        const won = (isOnLiberal && g.winner === "liberal") || (!isOnLiberal && g.winner === "fascist");
        
        return {
          date: new Date(g.playedAt).toLocaleDateString(),
          won,
          details: {
            role: g.declaredHitler === playerName ? "Hitler" : isOnLiberal ? "Liberal" : "Fascist",
            outcome: g.winner === "liberal" ? "Liberals" : "Fascists"
          }
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};
