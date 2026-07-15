import { useMemo, useState } from "react";
import { getGameHistorian } from "../../app/gameRegistry";
import { recordGamePlayerStats } from "../../app/gamePlayerStats";
import { deletePlayerName, loadSavedPlayerNames, savePlayerNames } from "../../app/players";
import { getPlayerSelectionStats } from "../../app/playerSelectionStats";
import {
  assignRoles,
  getRoleView,
  type SecretPlayer,
  type Policy,
  getPlayerFaction,
  createPolicyDeck,
  shufflePolicies,
  drawPolicies,
  getFascistPowerDescription,
} from "./logic";

type Step = "count" | "names" | "ready" | "buffer" | "reveal" | "inGame" | "summary";
type WinningTeam = "liberal" | "fascist";
type FrontTab = "setup" | "history";
type LegislativeStep = "idle" | "drawn" | "chancellorSelect" | "chancellorChoose" | "enacted";

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
  killedPlayers: string[];
}

function loadHistory(): GameHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry: GameHistoryEntry) {
  if (typeof window === "undefined") return;
  const current = loadHistory();
  const next = [entry, ...current].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
}

function SecretHitlerRoleReveal({ onBackHome }: { onBackHome: () => void }) {
  const [step, setStep] = useState<Step>("count");
  const [playerCount, setPlayerCount] = useState<number>(5);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState<string>("");
  const [savedNames, setSavedNames] = useState<string[]>(() => loadSavedPlayerNames());
  const [players, setPlayers] = useState<SecretPlayer[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [winner, setWinner] = useState<WinningTeam>("liberal");
  const [declaredHitler, setDeclaredHitler] = useState<string>("");
  const [liberalPolicies, setLiberalPolicies] = useState<number>(0);
  const [fascistPolicies, setFascistPolicies] = useState<number>(0);
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadHistory());
  const [frontTab, setFrontTab] = useState<FrontTab>("setup");

  // In-Game State
  const [deck, setDeck] = useState<Policy[]>([]);
  const [discard, setDiscard] = useState<Policy[]>([]);
  const [currentPresidentIndex, setCurrentPresidentIndex] = useState<number>(0);
  const [currentChancellorIndex, setCurrentChancellorIndex] = useState<number | null>(null);
  const [lastPresidentIndex, setLastPresidentIndex] = useState<number | null>(null);
  const [lastChancellorIndex, setLastChancellorIndex] = useState<number | null>(null);
  const [drawnPolicies, setDrawnPolicies] = useState<Policy[]>([]);
  const [legislativeStep, setLegislativeStep] = useState<LegislativeStep>("idle");
  const [killedPlayers, setKilledPlayers] = useState<Set<string>>(new Set());
  const [factionReveals, setFactionReveals] = useState<Record<string, "Liberal" | "Fascist">>({});
  const [lastEnacted, setLastEnacted] = useState<{ policy: Policy; power?: string | null } | null>(null);
  const [gameMessage, setGameMessage] = useState<string>("");

  const currentPlayer = players[currentIndex];
  const liberalTeam = useMemo(() => players.filter(p => p.role === "liberal").map(p => p.name), [players]);
  const fascistTeam = useMemo(() => players.filter(p => p.role !== "liberal").map(p => p.name), [players]);
  const actualHitler = useMemo(() => players.find(p => p.role === "hitler")?.name ?? "", [players]);
  const historian = useMemo(() => getGameHistorian("secret-hitler"), []);
  const [failedElections, setFailedElections] = useState<number>(0);

  const playerStats = useMemo(() => {
    if (!historian) return [];
    const statsHistory = historian.loadHistory();
    return savedNames
      .map((name) => {
        const stats = historian.getPlayerStats(name, statsHistory);
        const hitlerCount = typeof stats.stats["Hitler Count"] === "number" ? stats.stats["Hitler Count"] : 0;
        return { name, wins: stats.wins, losses: stats.losses, hitlerCount, games: stats.gamesPlayed };
      })
      .filter(entry => entry.games > 0)
      .sort((a, b) => b.games - a.games);
  }, [historian, savedNames, history]);

  const roleView = useMemo(() => currentPlayer ? getRoleView(players, currentIndex) : null, [players, currentIndex, currentPlayer]);
  const selectionStats = useMemo(() => getPlayerSelectionStats("secret-hitler", savedNames), [savedNames, history]);

  const currentPresident = players[currentPresidentIndex];
  const availableChancellors = players.filter((p, i) => 
    i !== currentPresidentIndex && 
    !killedPlayers.has(p.name) &&
    i !== lastPresidentIndex && 
    i !== lastChancellorIndex
  );

  const addName = (rawName: string) => {
    const name = rawName.trim();
    if (!name || selectedNames.length >= playerCount) return;
    setSelectedNames(names => [...names, name]);
    if (!savedNames.includes(name)) setSavedNames(names => [name, ...names]);
  };

  const removeName = (index: number) => setSelectedNames(names => names.filter((_, i) => i !== index));

  const beginReveal = () => {
    const assigned = assignRoles(selectedNames);
    setPlayers(assigned);
    setCurrentIndex(0);
    const hitler = assigned.find(p => p.role === "hitler")?.name ?? "";
    setDeclaredHitler(hitler);
    setWinner("liberal");
    setLiberalPolicies(0);
    setFascistPolicies(0);
    savePlayerNames(selectedNames);
    setStep("buffer");
  };

  const goNextPlayer = () => {
    if (currentIndex >= players.length - 1) {
      initializeInGame();
      setStep("inGame");
      return;
    }
    setCurrentIndex(index => index + 1);
    setStep("buffer");
  };

  const initializeInGame = () => {
    const newDeck = shufflePolicies(createPolicyDeck());
    setDeck(newDeck);
    setDiscard([]);
    setLiberalPolicies(0);
    setFascistPolicies(0);
    setKilledPlayers(new Set());
    setFactionReveals({});
    setLastEnacted(null);
    setLastPresidentIndex(null);
    setLastChancellorIndex(null);
    setGameMessage("Game started! Random first President selected.");

    const randomIndex = Math.floor(Math.random() * players.length);
    setCurrentPresidentIndex(randomIndex);
    setCurrentChancellorIndex(null);
    setDrawnPolicies([]);
    setLegislativeStep("idle");
  };

const handleFailedElection = () => {
  setGameMessage("3 failed elections! Drawing random policy...");

  let currentDeck = reshuffleIfNeeded(deck);
  if (currentDeck.length === 0) {
    setGameMessage("Deck is empty.");
    return;
  }

  const randomPolicy = currentDeck[0];
  const remaining = currentDeck.slice(1);
  setDeck(remaining);

  setTimeout(() => {
    enactPolicy(randomPolicy, true); // ignore special power
    setFailedElections(0);
  }, 800);
};

  const reshuffleIfNeeded = (currentDeck: Policy[]) => {
    if (currentDeck.length >= 3) return currentDeck;
    const combined = [...currentDeck, ...discard];
    const newDeck = shufflePolicies(combined);
    setDeck(newDeck);
    setDiscard([]);
    setGameMessage("Deck reshuffled from discard pile.");
    return newDeck;
  };

  const drawForPresident = () => {
    let currentDeck = reshuffleIfNeeded(deck);
    if (currentDeck.length < 3) {
      setGameMessage("Not enough policies.");
      return;
    }
    const { drawn, remaining } = drawPolicies(currentDeck, 3);
    setDeck(remaining);
    setDrawnPolicies(drawn);
    setLegislativeStep("drawn");
    setGameMessage(`${currentPresident?.name} drew 3 policies. Choose one to discard.`);
  };

  const discardPolicy = (discardIndex: number) => {
    if (drawnPolicies.length !== 3) return;
    const kept = drawnPolicies.filter((_, i) => i !== discardIndex);
    const discarded = drawnPolicies[discardIndex];
    setDrawnPolicies(kept);
    setDiscard(prev => [...prev, discarded]);
    setLegislativeStep("chancellorSelect");
    setGameMessage("Policy discarded. Select Chancellor.");
  };

  const selectChancellor = (chancellorIdx: number) => {
    setCurrentChancellorIndex(chancellorIdx);
    setLegislativeStep("chancellorChoose");
    setGameMessage(`${players[chancellorIdx].name} is Chancellor. Choose policy.`);
  };

  const chancellorChoose = (chosenIndex: number) => {
    if (drawnPolicies.length !== 2) return;
    const chosen = drawnPolicies[chosenIndex];
    const other = drawnPolicies[1 - chosenIndex];
    enactPolicy(chosen);
    setDiscard(prev => [...prev, other]);
    setDrawnPolicies([]);
    setCurrentChancellorIndex(null);
    setLegislativeStep("enacted");
  };

const enactPolicy = (policy: Policy, ignorePower = false) => {
  let newLib = liberalPolicies;
  let newFas = fascistPolicies;
  let power: string | null = null;

  if (policy === "liberal") {
    newLib = Math.min(5, liberalPolicies + 1);
    setLiberalPolicies(newLib);
  } else {
    newFas = Math.min(6, fascistPolicies + 1);
    setFascistPolicies(newFas);
    
    if (!ignorePower) {
      power = getFascistPowerDescription(players.length, newFas);
    }
  }

  setLastEnacted({ policy, power });

  if (newLib >= 5) {
    setWinner("liberal");
    setGameMessage("Liberals win with 5 policies!");
    setTimeout(() => setStep("summary"), 2000);
    return;
  }
  if (newFas >= 6) {
    setWinner("fascist");
    setGameMessage("Fascists win with 6 policies!");
    setTimeout(() => setStep("summary"), 2000);
    return;
  }

  const policyMessage = `${policy.toUpperCase()} policy enacted.`;
  const fullMessage = power ? `${policyMessage} Special Power: ${power}` : policyMessage;

  setGameMessage(fullMessage);

  // Keep the message longer
  setLastPresidentIndex(currentPresidentIndex);
  setLastChancellorIndex(currentChancellorIndex);

  setTimeout(() => {
    advanceToNextPresident();
    setLegislativeStep("idle");
    // Clear the message after a bit but keep lastEnacted for reference
    setTimeout(() => setGameMessage(""), 4000);
  }, 2500);
};

  const advanceToNextPresident = () => {
    let next = (currentPresidentIndex + 1) % players.length;
    while (killedPlayers.has(players[next].name) && players.length > 1) {
      next = (next + 1) % players.length;
    }
    setCurrentPresidentIndex(next);
    setGameMessage(`Next President: ${players[next].name}`);
  };

const revealFaction = (name: string) => {
  const player = players.find(p => p.name === name);
  if (!player) return;

  const faction = getPlayerFaction(player);
  setFactionReveals(prev => ({ ...prev, [name]: faction }));
  setGameMessage(`${name} is a ${faction}. (Hiding in 5 seconds...)`);

  // Auto-hide after 5 seconds for privacy
  setTimeout(() => {
    setFactionReveals(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    setGameMessage("Faction hidden.");
  }, 5000);
};


  const saveGameResult = () => {
    if (!players.length || !declaredHitler) return;
    const entry: GameHistoryEntry = {
      playedAt: new Date().toISOString(),
      players: players.map(p => p.name),
      liberalTeam,
      fascistTeam,
      winner,
      declaredHitler,
      liberalPolicies,
      fascistPolicies,
      killedPlayers: Array.from(killedPlayers)
    };

    
    saveHistoryEntry(entry);
    recordGamePlayerStats({
      gameId: "secret-hitler",
      players: entry.players,
      winners: entry.winner === "liberal" ? entry.liberalTeam : entry.fascistTeam,
      numericStatsByPlayer: { [entry.declaredHitler]: { hitlerCount: 1 } }
    });
    setHistory(items => [entry, ...items].slice(0, MAX_HISTORY_ITEMS));
  };

  const deletePlayer = (name: string) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete ${name}?`)) return;
    deletePlayerName(name);
    const next = savedNames.filter(n => n !== name);
    setSavedNames(next);
  };

  const deleteGame = (playedAt: string) => {
    const nextHistory = history.filter(e => e.playedAt !== playedAt);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
  };

  const clearAllHistory = () => {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistory([]);
  };

  const reset = (keepPlayers = false) => {
    setStep("count");
    setSelectedNames(keepPlayers ? selectedNames : []);
    setPlayers([]);
    setCurrentIndex(0);
    setWinner("liberal");
    setDeclaredHitler("");
    setLiberalPolicies(0);
    setFascistPolicies(0);
    setNameInput("");
    setSavedNames(loadSavedPlayerNames());
    setHistory(loadHistory());
    setFrontTab("setup");
    setDeck([]);
    setDiscard([]);
    setCurrentPresidentIndex(0);
    setCurrentChancellorIndex(null);
    setLastPresidentIndex(null);
    setLastChancellorIndex(null);
    setDrawnPolicies([]);
    setLegislativeStep("idle");
    setKilledPlayers(new Set());
    setFactionReveals({});
    setLastEnacted(null);
    setGameMessage("");
  };

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Secret Hitler</p>
          <h1>Role Reveal + Full Game</h1>
          <div className="actions">
            <button type="button" className="secondary" onClick={onBackHome}>Back to game hub</button>
          </div>
        </div>

        {step === "count" ? (
          <section className="panel" aria-labelledby="count-heading">
            <div className="panel-tabs" role="tablist">
              <button type="button" role="tab" className={`panel-tab${frontTab === "setup" ? " active" : ""}`} onClick={() => setFrontTab("setup")}>New game</button>
              <button type="button" role="tab" className={`panel-tab${frontTab === "history" ? " active" : ""}`} onClick={() => setFrontTab("history")}>Past games</button>
            </div>

            {frontTab === "setup" ? (
              <>
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
                  <button type="button" className="primary" onClick={() => setStep("names")}>Continue</button>
                </div>
              </>
            ) : history.length > 0 ? (
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
            {entry.killedPlayers && entry.killedPlayers.length > 0 && (
              <>
                <span className="hc-label">Killed</span>
                <span className="hc-value">{entry.killedPlayers.join(", ")}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  </>
) : (
              <p className="support-copy">No games saved yet.</p>
            )}
          </section>
        ) : null}

        {step === "names" ? (
          <section className="panel" aria-labelledby="names-heading">
            <h2 id="names-heading">Add player names</h2>
            <p className="support-copy">Selected: {selectedNames.length}/{playerCount}</p>

            <label className="field field-wide">
              <span>Add new name</span>
              <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Enter name" />
            </label>
            <div className="actions">
              <button type="button" className="primary" onClick={() => { addName(nameInput); setNameInput(""); }}>Add name</button>
            </div>

            <h3>Players you've used before</h3>
            <div className="game-grid">
              {savedNames.map((name) => {
                const used = selectedNames.includes(name);
                const stats = selectionStats.get(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className="saved-player-card"
                    disabled={used || selectedNames.length >= playerCount}
                    onClick={() => addName(name)}
                  >
                    <strong>{name}</strong>
                    <span>{stats && stats.gamesPlayed > 0 ? `${stats.wins} wins • ${stats.gamesPlayed} games` : "No games yet"}</span>
                  </button>
                );
              })}
            </div>

            <h3>Current game players</h3>
            <div className="score-breakdown compact">
              {selectedNames.map((name, index) => (
                <div key={`${name}-${index}`} className="score-row">
                  <span>{index + 1}. {name}</span>
                  <button type="button" className="secondary" onClick={() => removeName(index)}>Remove</button>
                </div>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep("count")}>Back</button>
              <button type="button" className="primary" disabled={selectedNames.length !== playerCount} onClick={() => setStep("ready")}>Continue</button>
            </div>
          </section>
        ) : null}

        {step === "ready" ? (
          <section className="panel">
            <h2>Roles ready</h2>
            <p className="support-copy">Hand the phone to each player only when prompted.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={beginReveal}>Begin role reveal</button>
            </div>
          </section>
        ) : null}

        {step === "buffer" && currentPlayer ? (
          <section className="panel">
            <h2>Hand the device to: {currentPlayer.name}</h2>
            <p className="support-copy">Only {currentPlayer.name} should tap reveal.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => setStep("reveal")}>Reveal role</button>
            </div>
          </section>
        ) : null}

        {step === "reveal" && currentPlayer && roleView ? (
          <section className={`panel role-panel role-${roleView.theme}`}>
            <h2>{roleView.heading}</h2>
            <div className="score-breakdown compact">
              {roleView.lines.map((line, i) => <div key={i} className="score-row"><span>{line}</span></div>)}
            </div>
            <div className="actions">
              <button type="button" className="primary" onClick={goNextPlayer}>Done - Pass to Next Player</button>
            </div>
          </section>
        ) : null}

        {step === "inGame" && (
          <section className="panel">
            <h2>In-Game — Legislative Phase</h2>
            <button type="button" className="secondary" onClick={handleFailedElection}>3 Failed Elections (test)</button>
            <p className="support-copy">{gameMessage}</p>

            <div><strong>Who is President?:</strong> {currentPresident?.name}</div>

            <h3>Players (tap to reveal faction)</h3>
            <div className="game-grid">
              {players.map((p, i) => (
                <button key={i} type="button" className="saved-player-card" onClick={() => revealFaction(p.name)}>
                  {p.name} {factionReveals[p.name] && `(${factionReveals[p.name]})`} {killedPlayers.has(p.name) && "☠️"}
                </button>
              ))}
            </div>

            <div>
              {legislativeStep === "idle" && <button type="button" className="primary" onClick={drawForPresident}>Draw 3 Policies</button>}
              {legislativeStep === "drawn" && drawnPolicies.length === 3 && (
                <div>
                  <p>Discard one:</p>
                  {drawnPolicies.map((p, i) => <button key={i} onClick={() => discardPolicy(i)}>{p}</button>)}
                </div>
              )}
              {legislativeStep === "chancellorSelect" && (
                <div>
                  <p>Select Chancellor:</p>
                  {availableChancellors.map(p => (
                    <button key={p.name} onClick={() => selectChancellor(players.findIndex(pl => pl.name === p.name))}>{p.name}</button>
                  ))}
                </div>
              )}
              {legislativeStep === "chancellorChoose" && drawnPolicies.length === 2 && (
                <div>
                  <p>Chancellor chooses:</p>
                  {drawnPolicies.map((p, i) => <button key={i} onClick={() => chancellorChoose(i)}>{p}</button>)}
                </div>
              )}
            </div>

            <div>Liberal: {liberalPolicies}/5 | Fascist: {fascistPolicies}/6</div>

            {lastEnacted && lastEnacted.power && (
              <div className="special-power-alert">
                <strong>Special Power Triggered:</strong> {lastEnacted.power}
              </div>
            )}

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep("summary")}>End Game → Summary</button>
            </div>
          </section>
        )}

        {step === "summary" ? (
          <section className="panel">
            <h2>Game Over — {winner === "liberal" ? "Liberals Win!" : "Fascists Win!"}</h2>
            <p>Hitler was: {declaredHitler}</p>
            <p>Liberal Policies: {liberalPolicies}/5</p>
            <p>Fascist Policies: {fascistPolicies}/6</p>
            <p>Killed: {killedPlayers.size > 0 ? Array.from(killedPlayers).join(", ") : "None"}</p>

            <div className="actions">
              <button type="button" className="secondary" onClick={saveGameResult}>Save Result</button>
              <button type="button" className="primary" onClick={() => reset(true)}>Play Again with Same Players</button>
              <button 
                type="button" 
                className="primary" 
                onClick={() => reset(false)}
              >
                New Game
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default SecretHitlerRoleReveal;