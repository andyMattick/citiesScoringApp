interface StoredGamePlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  numericStats: Record<string, number>;
}

type StoredGamePlayerStatsMap = Record<string, StoredGamePlayerStats>;

interface RecordGameStatsInput {
  gameId: string;
  players: string[];
  winners: string[];
  numericStatsByPlayer?: Record<string, Record<string, number>>;
}

function getStorageKey(gameId: string): string {
  return `game-player-stats-${gameId}-v1`;
}

export function loadGamePlayerStats(gameId: string): StoredGamePlayerStatsMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(gameId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        if (!value || typeof value !== "object") {
          return false;
        }

        const candidate = value as StoredGamePlayerStats;
        return (
          typeof candidate.gamesPlayed === "number" &&
          typeof candidate.wins === "number" &&
          typeof candidate.losses === "number" &&
          candidate.numericStats &&
          typeof candidate.numericStats === "object"
        );
      })
    ) as StoredGamePlayerStatsMap;
  } catch {
    return {};
  }
}

export function saveGamePlayerStats(gameId: string, stats: StoredGamePlayerStatsMap): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(gameId), JSON.stringify(stats));
}

export function recordGamePlayerStats({ gameId, players, winners, numericStatsByPlayer = {} }: RecordGameStatsInput): void {
  const existing = loadGamePlayerStats(gameId);
  const winnerSet = new Set(winners);

  for (const player of players) {
    const current = existing[player] ?? {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      numericStats: {}
    };

    const won = winnerSet.has(player);
    const nextNumericStats = { ...current.numericStats };
    const incomingStats = numericStatsByPlayer[player] ?? {};

    for (const [key, value] of Object.entries(incomingStats)) {
      nextNumericStats[key] = (nextNumericStats[key] ?? 0) + value;
    }

    existing[player] = {
      gamesPlayed: current.gamesPlayed + 1,
      wins: current.wins + (won ? 1 : 0),
      losses: current.losses + (won ? 0 : 1),
      numericStats: nextNumericStats
    };
  }

  saveGamePlayerStats(gameId, existing);
}

export function removePlayerGameStats(gameId: string, playerName: string): void {
  const existing = loadGamePlayerStats(gameId);
  if (!(playerName in existing)) {
    return;
  }

  delete existing[playerName];
  saveGamePlayerStats(gameId, existing);
}