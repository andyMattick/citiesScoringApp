/**
 * TEMPLATE: How to Add a New Game to the Plug-and-Play System
 * 
 * Follow these steps to add a new game that integrates with the shared player hub:
 */

/*
1. CREATE A HISTORIAN FILE
   Location: src/games/{game-name}/historian.ts
   
   Copy this template and adapt to your game:
*/

import type { GameHistorian } from "../../app/gameRegistry";

interface YourGameEntry {
  playedAt: string;
  players: string[];
  winnerName: string;
  // ... other game-specific fields
}

export const YourGameHistorian: GameHistorian = {
  id: "your-game-id",           // e.g., "ticket-to-ride"
  name: "Your Game Name",       // e.g., "Ticket to Ride"
  storageKey: "your-game-history-v1",  // unique storage key
  
  loadHistory: () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("your-game-history-v1");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  
  getPlayerStats: (playerName: string, history: YourGameEntry[]) => {
    // Filter games this player participated in
    const playerGames = history.filter((g) => g.players.includes(playerName));
    
    // Calculate wins
    const wins = playerGames.filter((g) => g.winnerName === playerName).length;
    
    // Calculate any other stats you want to track
    const avgScore = 0; // Calculate based on your game's scoring
    
    return {
      gamesPlayed: playerGames.length,
      wins,
      losses: playerGames.length - wins,
      stats: {
        "Avg Score": avgScore,
        // Add any custom stats here
      }
    };
  },
  
  getPlayerGames: (playerName: string, history: YourGameEntry[]) => {
    return history
      .filter((g) => g.players.includes(playerName))
      .map((g) => {
        const won = g.winnerName === playerName;
        return {
          date: new Date(g.playedAt).toLocaleDateString(),
          won,
          details: {
            // Populate with game-specific details that appear in history
            result: won ? "Victory" : "Played"
          }
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};

/*
2. REGISTER THE HISTORIAN
   Edit: src/app/registerHistorians.ts
   
   Add your historian to the imports and registration:
*/

// import { YourGameHistorian } from "../games/your-game/historian";

// export function registerAllGameHistorians() {
//   registerGameHistorian(SecretHitlerHistorian);
//   registerGameHistorian(CitiesHistorian);
//   registerGameHistorian(YourGameHistorian);  // ADD THIS
// }

/*
3. IN YOUR GAME COMPONENT
   - Load player names using: loadSavedPlayerNames() from "app/players"
   - Save player names after setup: savePlayerNames(names) from "app/players"
   - Save game history to localStorage with your unique storage key:
*/

// Example in your game component:
const gameEntry = {
  playedAt: new Date().toISOString(),
  players: allPlayerNames,
  winnerName: winnerName,
  // ... other fields
};

const history = JSON.parse(localStorage.getItem("your-game-history-v1") || "[]");
localStorage.setItem("your-game-history-v1", JSON.stringify([gameEntry, ...history]));

/**
 * That's it! 
 * 
 * The PlayersHub will automatically:
 * - Load your historian
 * - Aggregate player stats from all games
 * - Display game history with all your custom details
 */
