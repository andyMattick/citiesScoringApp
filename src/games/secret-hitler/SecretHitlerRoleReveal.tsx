import { useMemo, useState } from "react";
import { assignRoles, getRoleView, type SecretPlayer } from "./logic";

type Step = "count" | "names" | "ready" | "buffer" | "reveal" | "summary";
type WinningTeam = "liberal" | "fascist";

const STORAGE_KEY = "secret-hitler-players-v1";
const HISTORY_STORAGE_KEY = "secret-hitler-history-v1";
const MAX_HISTORY_ITEMS = 20;

interface GameHistoryEntry {
  playedAt: string;
  players: string[];
  liberalTeam: string[];
  fascistTeam: string[];
  winner: WinningTeam;
  declaredHitler: string;
  liberalPolicies: number;
  fascistPolicies: number;
}

function loadSavedNames(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((name): name is string => typeof name === "string" && name.trim().length > 0);
  } catch {
    return [];
  }
}

function saveNames(names: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = loadSavedNames();
  const merged = Array.from(new Set([...existing, ...names.map((name) => name.trim())])).filter(Boolean);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

function loadHistory(): GameHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, MAX_HISTORY_ITEMS).filter((entry): entry is GameHistoryEntry => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      return (
        typeof entry.playedAt === "string" &&
        Array.isArray(entry.players) &&
        Array.isArray(entry.liberalTeam) &&
        Array.isArray(entry.fascistTeam) &&
        (entry.winner === "liberal" || entry.winner === "fascist") &&
        typeof entry.declaredHitler === "string" &&
        typeof entry.liberalPolicies === "number" &&
        typeof entry.fascistPolicies === "number"
      );
    });
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry: GameHistoryEntry) {
  if (typeof window === "undefined") {
    return;
  }

  const current = loadHistory();
  const next = [entry, ...current].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
}

function SecretHitlerRoleReveal({ onBackHome }: { onBackHome: () => void }) {
  const [step, setStep] = useState<Step>("count");
  const [playerCount, setPlayerCount] = useState<number>(5);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState<string>("");
  const [savedNames, setSavedNames] = useState<string[]>(() => loadSavedNames());
  const [players, setPlayers] = useState<SecretPlayer[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [winner, setWinner] = useState<WinningTeam>("liberal");
  const [declaredHitler, setDeclaredHitler] = useState<string>("");
  const [liberalPolicies, setLiberalPolicies] = useState<number>(0);
  const [fascistPolicies, setFascistPolicies] = useState<number>(0);
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadHistory());

  const currentPlayer = players[currentIndex];
  const liberalTeam = useMemo(
    () => players.filter((player) => player.role === "liberal").map((player) => player.name),
    [players]
  );
  const fascistTeam = useMemo(
    () => players.filter((player) => player.role !== "liberal").map((player) => player.name),
    [players]
  );
  const actualHitler = useMemo(() => players.find((player) => player.role === "hitler")?.name ?? "", [players]);

  const playerStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; hitlerCount: number }>();
    for (const entry of history) {
      for (const name of entry.players) {
        if (!map.has(name)) map.set(name, { wins: 0, losses: 0, hitlerCount: 0 });
        const stat = map.get(name)!;
        const onLiberal = entry.liberalTeam.includes(name);
        const won = (onLiberal && entry.winner === "liberal") || (!onLiberal && entry.winner === "fascist");
        if (won) stat.wins++; else stat.losses++;
        if (entry.declaredHitler === name) stat.hitlerCount++;
      }
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s, games: s.wins + s.losses }))
      .sort((a, b) => b.games - a.games);
  }, [history]);
  const roleView = useMemo(() => {
    if (!currentPlayer) {
      return null;
    }
    return getRoleView(players, currentIndex);
  }, [players, currentIndex, currentPlayer]);

  const addName = (rawName: string) => {
    const name = rawName.trim();
    if (!name || selectedNames.length >= playerCount) {
      return;
    }

    setSelectedNames((names) => [...names, name]);
    if (!savedNames.includes(name)) {
      setSavedNames((names) => [name, ...names]);
    }
  };

  const removeName = (index: number) => {
    setSelectedNames((names) => names.filter((_, nameIndex) => nameIndex !== index));
  };

  const beginReveal = () => {
    const assigned = assignRoles(selectedNames);
    setPlayers(assigned);
    setCurrentIndex(0);
    const hitler = assigned.find((player) => player.role === "hitler")?.name ?? "";
    setDeclaredHitler(hitler);
    setWinner("liberal");
    setLiberalPolicies(0);
    setFascistPolicies(0);
    saveNames(selectedNames);
    setStep("buffer");
  };

  const goNextPlayer = () => {
    if (currentIndex >= players.length - 1) {
      setStep("summary");
      return;
    }

    setCurrentIndex((index) => index + 1);
    setStep("buffer");
  };

  const saveGameResult = () => {
    if (!players.length || !declaredHitler) {
      return;
    }

    const entry: GameHistoryEntry = {
      playedAt: new Date().toISOString(),
      players: players.map((player) => player.name),
      liberalTeam,
      fascistTeam,
      winner,
      declaredHitler,
      liberalPolicies,
      fascistPolicies
    };

    saveHistoryEntry(entry);
    setHistory((items) => [entry, ...items].slice(0, MAX_HISTORY_ITEMS));
  };

  const deletePlayer = (name: string) => {
    const next = savedNames.filter((n) => n !== name);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedNames(next);
    // also purge all history entries that include this player
    const nextHistory = history.filter((e) => !e.players.includes(name));
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
  };

  const deleteGame = (playedAt: string) => {
    const nextHistory = history.filter((e) => e.playedAt !== playedAt);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
  };

  const clearAllHistory = () => {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistory([]);
  };

  const reset = () => {
    setStep("count");
    setSelectedNames([]);
    setPlayers([]);
    setCurrentIndex(0);
    setWinner("liberal");
    setDeclaredHitler("");
    setLiberalPolicies(0);
    setFascistPolicies(0);
    setNameInput("");
    setSavedNames(loadSavedNames());
    setHistory(loadHistory());
  };

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Secret Hitler role reveal</p>
          <h1>Pass the phone. Reveal one role at a time.</h1>
          <p className="lede">Roles are private per turn. Use touch controls only after entering names.</p>
          <div className="actions">
            <button type="button" className="secondary" onClick={onBackHome}>
              Back to game hub
            </button>
          </div>
        </div>

        {step === "count" ? (
          <section className="panel" aria-labelledby="count-heading">
            <h2 id="count-heading">How many players?</h2>
            <div className="game-grid">
              {[5, 6, 7, 8, 9, 10].map((count) => (
                <button key={count} type="button" className={`city-tile${playerCount === count ? " selected" : ""}`} onClick={() => setPlayerCount(count)}>
                  <span className="city-code">{count}</span>
                  <span>{count} players</span>
                </button>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="primary" onClick={() => setStep("names")}>
                Continue
              </button>
            </div>

            {playerStats.length > 0 ? (
              <>
                <h3 className="section-subhead">Player stats</h3>
                <div className="stats-table">
                  <div className="stats-header">
                    <span>Player</span>
                    <span title="Games played">GP</span>
                    <span title="Wins">W</span>
                    <span title="Losses">L</span>
                    <span title="Times as Hitler">🧔</span>
                    <span />
                  </div>
                  {playerStats.map((s) => (
                    <div key={s.name} className="stats-row">
                      <span className="stats-name">{s.name}</span>
                      <span className="stats-num">{s.games}</span>
                      <span className="stats-num win-num">{s.wins}</span>
                      <span className="stats-num loss-num">{s.losses}</span>
                      <span className="stats-num hitler-num">{s.hitlerCount > 0 ? s.hitlerCount : "—"}</span>
                      <button type="button" className="del-btn" title={`Delete ${s.name} and their game history`} onClick={() => deletePlayer(s.name)}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {history.length > 0 ? (
              <>
                <div className="section-subhead-row">
                  <h3 className="section-subhead" style={{ margin: 0 }}>Recent games</h3>
                  <button type="button" className="del-btn-text" onClick={clearAllHistory}>Clear all</button>
                </div>
                <div className="history-cards">
                  {history.map((entry) => (
                    <div key={entry.playedAt} className={`history-card hc-${entry.winner}`}>
                      <div className="hc-header">
                        <span className={`winner-badge wb-${entry.winner}`}>{entry.winner === "liberal" ? "🕊️ Liberals won" : "💀 Fascists won"}</span>
                        <span className="hc-date">{new Date(entry.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        <button type="button" className="del-btn" title="Delete this game" onClick={() => deleteGame(entry.playedAt)}>✕</button>
                      </div>
                      <div className="hc-details">
                        <span className="hc-label">Hitler</span>
                        <span className="hc-value">🧔 {entry.declaredHitler}</span>
                        <span className="hc-label">Players</span>
                        <span className="hc-value">{entry.players.join(", ")}</span>
                        <span className="hc-label">Policies</span>
                        <span className="hc-value">
                          <span className="policy-pip lib">{entry.liberalPolicies} liberal</span>
                          {" / "}
                          <span className="policy-pip fas">{entry.fascistPolicies} fascist</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {step === "names" ? (
          <section className="panel" aria-labelledby="names-heading">
            <h2 id="names-heading">Add player names</h2>
            <p className="support-copy">Selected: {selectedNames.length}/{playerCount}</p>

            <label className="field field-wide">
              <span>Add new name</span>
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Enter name"
              />
            </label>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  addName(nameInput);
                  setNameInput("");
                }}
              >
                Add name
              </button>
            </div>

            <h3>Players you&apos;ve used before</h3>
            <div className="game-grid">
              {savedNames.length === 0 ? <p className="support-copy">No saved names yet.</p> : null}
              {savedNames.map((name) => {
                const used = selectedNames.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className="secondary"
                    disabled={used || selectedNames.length >= playerCount}
                    onClick={() => addName(name)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <h3>Current game players</h3>
            <div className="score-breakdown compact">
              {selectedNames.map((name, index) => (
                <div key={`${name}-${index}`} className="score-row">
                  <span>{index + 1}. {name}</span>
                  <button type="button" className="secondary" onClick={() => removeName(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep("count")}>
                Back
              </button>
              <button
                type="button"
                className="primary"
                disabled={selectedNames.length !== playerCount}
                onClick={() => setStep("ready")}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === "ready" ? (
          <section className="panel" aria-labelledby="ready-heading">
            <h2 id="ready-heading">Roles ready</h2>
            <p className="support-copy">Hand the phone to each player only when prompted.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={beginReveal}>
                Begin role reveal
              </button>
            </div>
          </section>
        ) : null}

        {step === "buffer" && currentPlayer ? (
          <section className="panel" aria-labelledby="buffer-heading">
            <h2 id="buffer-heading">Hand the device to: {currentPlayer.name}</h2>
            <p className="support-copy">Only {currentPlayer.name} should tap reveal.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => setStep("reveal")}>
                Reveal role
              </button>
            </div>
          </section>
        ) : null}

        {step === "reveal" && currentPlayer && roleView ? (
          <section className={`panel role-panel role-${roleView.theme}`} aria-labelledby="role-heading">
            <h2 id="role-heading">{roleView.heading}</h2>
            <p className="role-icon" aria-hidden>
              {roleView.theme === "liberal" ? "🕊️" : roleView.theme === "fascist" ? "💀" : "💀🧔"}
            </p>
            <div className="score-breakdown compact">
              {roleView.lines.map((line) => (
                <div key={line} className="score-row">
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="primary" onClick={goNextPlayer}>
                Done - Pass to Next Player
              </button>
            </div>
          </section>
        ) : null}

        {step === "summary" ? (
          <section className="panel" aria-labelledby="summary-heading">
            <h2 id="summary-heading">Roles revealed</h2>

            {/* Team cards */}
            <div className="summary-teams">
              <article className="team-card liberal-side">
                <p className="team-header">🕊️ Liberals</p>
                <div className="name-chip-list">
                  {liberalTeam.map((name) => (
                    <span key={name} className="name-chip lib-chip">{name}</span>
                  ))}
                </div>
              </article>
              <article className="team-card fascist-side">
                <p className="team-header">💀 Fascists</p>
                <div className="name-chip-list">
                  {fascistTeam.map((name) => (
                    <span key={name} className={`name-chip fas-chip${name === actualHitler ? " hitler-chip" : ""}`}>
                      {name === actualHitler ? "🧔 " : ""}{name}
                    </span>
                  ))}
                </div>
              </article>
            </div>

            {/* Policy track */}
            <div className="policy-tracks">
              <div className="policy-track-row">
                <span className="track-label lib-label">Liberal</span>
                <div className="track-dots">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className={`pdot lib-dot${i <= liberalPolicies ? " filled" : ""}`} />
                  ))}
                </div>
                <div className="track-stepper">
                  <button type="button" className="pip-btn" onClick={() => setLiberalPolicies((p) => Math.max(0, p - 1))}>−</button>
                  <span className="pip-count">{liberalPolicies}</span>
                  <button type="button" className="pip-btn" onClick={() => setLiberalPolicies((p) => Math.min(5, p + 1))}>+</button>
                </div>
              </div>
              <div className="policy-track-row">
                <span className="track-label fas-label">Fascist</span>
                <div className="track-dots">
                  {[1,2,3,4,5,6].map((i) => (
                    <span key={i} className={`pdot fas-dot${i <= fascistPolicies ? " filled" : ""}`} />
                  ))}
                </div>
                <div className="track-stepper">
                  <button type="button" className="pip-btn" onClick={() => setFascistPolicies((p) => Math.max(0, p - 1))}>−</button>
                  <span className="pip-count">{fascistPolicies}</span>
                  <button type="button" className="pip-btn" onClick={() => setFascistPolicies((p) => Math.min(6, p + 1))}>+</button>
                </div>
              </div>
            </div>

            {/* Result recording */}
            <div className="result-form">
              <div className="winner-row">
                <span className="result-label">Who won?</span>
                <div className="winner-toggle">
                  <button
                    type="button"
                    className={`wtog lib${winner === "liberal" ? " active" : ""}`}
                    onClick={() => setWinner("liberal")}
                  >🕊️ Liberals</button>
                  <button
                    type="button"
                    className={`wtog fas${winner === "fascist" ? " active" : ""}`}
                    onClick={() => setWinner("fascist")}
                  >💀 Fascists</button>
                </div>
              </div>
              <div className="hitler-row">
                <span className="result-label">🧔 Hitler was</span>
                <select className="hitler-select" value={declaredHitler} onChange={(event) => setDeclaredHitler(event.target.value)}>
                  <option value="">Select player</option>
                  {players.map((player) => (
                    <option key={player.name} value={player.name}>{player.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={saveGameResult} disabled={!declaredHitler}>
                Save result
              </button>
              <button type="button" className="primary" onClick={reset}>
                New game
              </button>
            </div>

            {history.length > 0 ? (
              <>
                <h3 className="section-subhead">Recent games</h3>
                <div className="history-cards">
                  {history.map((entry) => (
                    <div key={entry.playedAt} className={`history-card hc-${entry.winner}`}>
                      <div className="hc-header">
                        <span className={`winner-badge wb-${entry.winner}`}>{entry.winner === "liberal" ? "🕊️ Liberals won" : "💀 Fascists won"}</span>
                        <span className="hc-date">{new Date(entry.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </div>
                      <div className="hc-details">
                        <span className="hc-label">Hitler</span>
                        <span className="hc-value">🧔 {entry.declaredHitler}</span>
                        <span className="hc-label">Players</span>
                        <span className="hc-value">{entry.players.join(", ")}</span>
                        <span className="hc-label">Policies</span>
                        <span className="hc-value">
                          <span className="policy-pip lib">{entry.liberalPolicies} liberal</span>
                          {" / "}
                          <span className="policy-pip fas">{entry.fascistPolicies} fascist</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default SecretHitlerRoleReveal;