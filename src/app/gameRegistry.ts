/**
 * Game Registry System for plug-and-play game integration
 * Each game exports a historian that PlayersHub can use to aggregate stats
 */

export interface GameHistorian {
  id: string;
  name: string;
  storageKey: string;
  
  /**
   * Load this game's history from localStorage
   */
  loadHistory: () => any[];
  
  /**
   * Get aggregated stats for a specific player across all their games of this type
   */
  getPlayerStats: (playerName: string, history: any[]) => {
    gamesPlayed: number;
    wins: number;
    losses: number;
    stats: Record<string, number | string>;
  };
  
  /**
   * Get detailed game records for a player (for game history view)
   */
  getPlayerGames: (playerName: string, history: any[]) => Array<{
    date: string;
    won: boolean;
    details: Record<string, string | number>;
  }>;
}

const historians: Map<string, GameHistorian> = new Map();

export function registerGameHistorian(historian: GameHistorian): void {
  historians.set(historian.id, historian);
}

export function getGameHistorian(gameId: string): GameHistorian | undefined {
  return historians.get(gameId);
}

export function getAllGameHistorians(): GameHistorian[] {
  return Array.from(historians.values());
}

export function getRegisteredGameIds(): string[] {
  return Array.from(historians.keys());
}
