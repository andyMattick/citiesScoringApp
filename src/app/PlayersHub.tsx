import { useMemo, useState } from "react";
import { deletePlayerName, loadSavedPlayerNames } from "./players";
import { getAllGameHistorians } from "./gameRegistry";
import "./registerHistorians";

interface PlayerStats {
  name: string;
  totalGames: number;
  lastGameDate: string;
  gameBreakdown: Record<string, {
    gamesPlayed: number;
    wins: number;
    losses: number;
    stats: Record<string, string | number>;
  }>;
}

function PlayersHub({ onBack }: { onBack: () => void }) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [savedNames, setSavedNames] = useState<string[]>(() => loadSavedPlayerNames());

  const historians = useMemo(() => getAllGameHistorians(), []);

  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {};

    for (const name of savedNames) {
      const gameBreakdown: Record<string, any> = {};
      const allGameDates: Date[] = [];

      for (const historian of historians) {
        const history = historian.loadHistory();
        const playerStats = historian.getPlayerStats(name, history);

        if (playerStats.gamesPlayed > 0) {
          gameBreakdown[historian.id] = {
            name: historian.name,
            ...playerStats
          };

          // Collect dates from this game
          const playerGames = historian.getPlayerGames(name, history);
          playerGames.forEach((g) => {
            allGameDates.push(new Date(g.date));
          });
        }
      }

      const totalGames = Object.values(gameBreakdown).reduce((sum, g: any) => sum + g.gamesPlayed, 0);
      const lastGameDate = allGameDates.length > 0 
        ? allGameDates.sort((a, b) => b.getTime() - a.getTime())[0].toLocaleDateString()
        : "—";

      stats[name] = {
        name,
        totalGames,
        lastGameDate,
        gameBreakdown
      };
    }

    return Object.values(stats)
      .sort((a, b) => new Date(b.lastGameDate).getTime() - new Date(a.lastGameDate).getTime())
      .sort((a, b) => b.totalGames - a.totalGames);
  }, [historians, savedNames]);

  const handleDeletePlayer = (name: string) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete ${name} from saved players? This will not remove past game results.`)) {
      return;
    }

    deletePlayerName(name);
    setSavedNames((names) => names.filter((savedName) => savedName !== name));
    setExpandedPlayer((current) => (current === name ? null : current));
  };

  const getPlayerGameDetails = (playerName: string) => {
    const allGames: Array<{ game: string; date: string; won: boolean; details: Record<string, string | number> }> = [];

    for (const historian of historians) {
      const history = historian.loadHistory();
      const playerGames = historian.getPlayerGames(playerName, history);
      playerGames.forEach((g) => {
        allGames.push({
          game: historian.name,
          ...g
        });
      });
    }

    return allGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Players</p>
          <h1>View player statistics across all games.</h1>
          <p className="lede">See wins, losses, and game history for each player.</p>
          <div className="actions">
            <button type="button" className="secondary" onClick={onBack}>
              Back to game hub
            </button>
          </div>
        </div>

        {playerStats.length === 0 ? (
          <section className="panel">
            <p style={{ textAlign: "center", color: "#666" }}>No players yet. Play a game to get started!</p>
          </section>
        ) : (
          <section className="panel" aria-labelledby="players-heading">
            <h2 id="players-heading">All Players ({playerStats.length})</h2>
            <p style={{ marginTop: 0, color: "#ffffff", fontSize: "0.9rem" }}>
              Use Delete on any player card to remove them from saved players only.
            </p>
            <div className="players-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {playerStats.map((player) => (
                <article
                  key={player.name}
                  className="player-card"
                  style={{
                    border: "2px solid #0066cc",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    cursor: "pointer",
                    backgroundColor: expandedPlayer === player.name ? "#e6f0ff" : "#f0f5ff",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => setExpandedPlayer(expandedPlayer === player.name ? null : player.name)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ margin: "0 0 0.5rem 0", color: "#1a1a1a" }}>{player.name}</h3>
                      <p style={{ margin: "0", fontSize: "0.9rem", color: "#555" }}>
                        Last played: {player.lastGameDate}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button
                        type="button"
                        style={{
                          border: "1px solid #d97777",
                          backgroundColor: "#ffe5e5",
                          color: "#7f1d1d",
                          borderRadius: "999px",
                          padding: "8px 12px",
                          fontWeight: 700
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeletePlayer(player.name);
                        }}
                        title={`Delete ${player.name} from saved players`}
                      >
                        Delete
                      </button>
                      <span style={{ fontSize: "0.85rem", color: "#0066cc", fontWeight: "bold" }}>
                        {expandedPlayer === player.name ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    <div className="stat-box" style={{ backgroundColor: "#fff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #ddd" }}>
                      <span style={{ fontSize: "0.8rem", color: "#555", fontWeight: "600" }}>Total Games</span>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "1.5rem", fontWeight: "bold", color: "#0066cc" }}>
                        {player.totalGames}
                      </p>
                    </div>

                    {Object.entries(player.gameBreakdown).map(([gameId, gameStats]: [string, any]) => (
                      <div key={gameId} style={{ backgroundColor: "#fff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #ddd" }}>
                        <span style={{ fontSize: "0.8rem", color: "#555", fontWeight: "600" }}>{gameStats.name}</span>
                        <p style={{ margin: "0.25rem 0 0 0", fontSize: "1.2rem", fontWeight: "bold", color: "#0066cc" }}>
                          {gameStats.gamesPlayed} games
                        </p>
                        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#333", fontWeight: "500" }}>
                          {gameStats.wins}W-{gameStats.losses}L
                        </p>
                        {Object.entries(gameStats.stats as Record<string, string | number>).map(([statKey, statValue]) => (
                          <div key={statKey} style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                            <span>{statKey}: </span>
                            <strong style={{ color: "#333" }}>{statValue}</strong>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {expandedPlayer === player.name && (
                    <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "2px solid #0066cc" }}>
                      <h4 style={{ marginTop: 0, marginBottom: "0.75rem", color: "#1a1a1a" }}>Game History</h4>
                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {getPlayerGameDetails(player.name).length === 0 ? (
                          <p style={{ color: "#666", fontSize: "0.9rem", margin: 0 }}>No games yet</p>
                        ) : (
                          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
                            {getPlayerGameDetails(player.name).map((game, idx) => (
                              <li
                                key={idx}
                                style={{
                                  padding: "0.75rem",
                                  borderBottom: idx < getPlayerGameDetails(player.name).length - 1 ? "1px solid #ddd" : "none",
                                  backgroundColor: idx % 2 === 0 ? "#fafafa" : "#fff",
                                  borderRadius: "4px",
                                  marginBottom: "0.5rem"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span>
                                    <strong style={{ color: "#0066cc" }}>{game.game}</strong>
                                  </span>
                                  <span
                                    style={{
                                      backgroundColor: game.won ? "#d4edda" : "#f8d7da",
                                      color: game.won ? "#155724" : "#721c24",
                                      padding: "0.25rem 0.5rem",
                                      borderRadius: "4px",
                                      fontSize: "0.85rem",
                                      fontWeight: "bold"
                                    }}
                                  >
                                    {game.won ? "Win" : "Loss"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#555", marginTop: "0.25rem" }}>
                                  {Object.entries(game.details).map(([key, value]) => (
                                    <div key={key}>
                                      <span style={{ color: "#666" }}>{key}:</span>{" "}
                                      <strong style={{ color: "#333" }}>{value}</strong>
                                    </div>
                                  ))}
                                  <div style={{ marginTop: "0.25rem", color: "#888", fontSize: "0.75rem" }}>
                                    {game.date}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default PlayersHub;
