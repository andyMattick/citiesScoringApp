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
type LegislativeStep = "idle" | "drawn" | "chancellorSelect" | "voting" | "chancellorChoose" | "enacted";
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
  const [showEnactModal, setShowEnactModal] = useState(false);
  const [proposedChancellorIndex, setProposedChancellorIndex] = useState<number | null>(null);
const [enactedThisTurn, setEnactedThisTurn] = useState<{policy: Policy, power?: string | null} | null>(null);
  const [failedElections, setFailedElections] = useState<number>(0);
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
  const [showRoleReveal, setShowRoleReveal] = useState(false);

  const currentPlayer = players[currentIndex];
  const liberalTeam = useMemo(() => players.filter(p => p.role === "liberal").map(p => p.name), [players]);
  const fascistTeam = useMemo(() => players.filter(p => p.role !== "liberal").map(p => p.name), [players]);
  const actualHitler = useMemo(() => players.find(p => p.role === "hitler")?.name ?? "", [players]);
  const historian = useMemo(() => getGameHistorian("secret-hitler"), []);

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
    // All players have seen their roles → start the game
    initializeInGame();        // Make sure this fully resets game state
    setCurrentIndex(0);        // Reset index for the game phase
    setStep("inGame");
    return;
  }

  // Move to next player
  setCurrentIndex(index => index + 1);
  setStep("buffer");           // or whatever your buffer step is
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
  setFailedElections(0);           // ← important
  setGameMessage("Game started! Random first President selected.");

  const randomIndex = Math.floor(Math.random() * players.length);
  setCurrentPresidentIndex(randomIndex);
  setCurrentChancellorIndex(null);
  setDrawnPolicies([]);
  setLegislativeStep("idle");
};

const selectChancellorFromPresidentPowers = () => {
  setLegislativeStep("chancellorSelect");
  setGameMessage("President, select the next Chancellor.");
};

const nameNextPresident = () => {
  const name = prompt("Enter the name of the next President:");
  if (!name) return;
  const idx = players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (idx !== -1) {
    setCurrentPresidentIndex(idx);
    setGameMessage(`${players[idx].name} is now President.`);
  } else {
    alert("Player not found.");
  }
};

const peekPlayerRole = () => {
  const name = prompt("Enter player name to peek:");
  if (!name) return;
  const player = players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (player) {
    alert(`${player.name}'s role is: ${player.role}`);
  } else {
    alert("Player not found.");
  }
};

const killPlayer = () => {
  const name = prompt("Enter player name to kill:");
  if (!name) return;

  const idx = players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) {
    alert("Player not found.");
    return;
  }

  const newKilled = new Set(killedPlayers);
  newKilled.add(players[idx].name);
  setKilledPlayers(newKilled);
  setGameMessage(`${players[idx].name} has been killed.`);

  // Hitler killed = Fascists win
  if (players[idx].role === "hitler") {
    setWinner("fascist");
    setGameMessage("Hitler has been killed! Fascists win!");
    setTimeout(() => setStep("summary"), 1500);
  }
};


const handleFailedElection = () => {
  const newFailed = failedElections + 1;
  setFailedElections(newFailed);
  setGameMessage(`Failed election #${newFailed} of 3.`);

  if (newFailed >= 3) {
    let currentDeck = reshuffleIfNeeded(deck);
    if (currentDeck.length === 0) {
      setGameMessage("Deck empty.");
      setFailedElections(0);
      return;
    }

    const randomPolicy = currentDeck[0];
    const remaining = currentDeck.slice(1);
    setDeck(remaining);

    setTimeout(() => {
      enactPolicy(randomPolicy, true); // ignore special power
      setFailedElections(0);
    }, 800);
  }
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
  console.log("drawForPresident called. Current deck size:", deck.length);

  let currentDeck = reshuffleIfNeeded(deck);
  console.log("After reshuffle, deck size:", currentDeck.length);

  if (currentDeck.length < 3) {
    setGameMessage("Not enough policies left in the deck.");
    console.log("Not enough policies");
    return;
  }

  const { drawn, remaining } = drawPolicies(currentDeck, 3);
  console.log("Drawn policies:", drawn);

  setDeck(remaining);
  setDrawnPolicies(drawn);
  setLegislativeStep("drawn");
  setGameMessage(`${currentPresident?.name} drew 3 policies. Choose one to discard.`);

  console.log("State updated - legislativeStep should now be 'drawn'");
};

const discardPolicy = (discardIndex: number) => {
  if (drawnPolicies.length !== 3) return;

  const kept = drawnPolicies.filter((_, i) => i !== discardIndex);
  const discarded = drawnPolicies[discardIndex];

  setDrawnPolicies(kept);
  setDiscard(prev => [...prev, discarded]);
  setLegislativeStep("chancellorChoose");

  const chancellorName = players[currentChancellorIndex!]?.name || "Chancellor";
  setGameMessage(`Policy discarded. ${chancellorName}, choose one to enact.`);
};

const approveChancellor = () => {
  setCurrentChancellorIndex(proposedChancellorIndex);
  setFailedElections(0);
  setProposedChancellorIndex(null);
  setLegislativeStep("drawn");           // Go to Draw 3 Policies
  setGameMessage(`${players[proposedChancellorIndex!].name} is now Chancellor. President, draw 3 policies.`);
};

const rejectChancellor = () => {
  setProposedChancellorIndex(null);
  handleFailedElection();   // Trigger failed election
};

const selectChancellor = (chancellorIdx: number) => {
  // Enforce rules: cannot be previous President or Chancellor
  if (chancellorIdx === lastPresidentIndex || chancellorIdx === lastChancellorIndex) {
    alert("This player cannot be Chancellor (was recent President or Chancellor).");
    return;
  }

  setProposedChancellorIndex(chancellorIdx);
  setLegislativeStep("voting");
  setGameMessage(`President nominated ${players[chancellorIdx].name} as Chancellor. Everyone votes now.`);
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

  // Hitler check
  if (fascistPolicies + (chosen === "fascist" ? 1 : 0) >= 3 && 
      players[currentChancellorIndex!]?.role === "hitler") {
    setWinner("fascist");
    setGameMessage("Hitler is Chancellor after 3+ fascist policies — Fascists win!");
    setTimeout(() => setStep("summary"), 1200);
  }
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
    if (!ignorePower) power = getFascistPowerDescription(players.length, newFas);
  }

  const result = { policy, power };
  setLastEnacted(result);
  setEnactedThisTurn(result);
  setShowEnactModal(true);

  if (newLib >= 5) {
    setWinner("liberal");
    setGameMessage("Liberals win!");
    setTimeout(() => setStep("summary"), 1500);
    return;
  }
  if (newFas >= 6) {
    setWinner("fascist");
    setGameMessage("Fascists win!");
    setTimeout(() => setStep("summary"), 1500);
    return;
  }

  setLastPresidentIndex(currentPresidentIndex);
  setLastChancellorIndex(currentChancellorIndex);

  setTimeout(() => {
    advanceToNextPresident();
    setLegislativeStep("idle");
  }, 800);
};

  const advanceToNextPresident = () => {
    let next = (currentPresidentIndex + 1) % players.length;
    while (killedPlayers.has(players[next].name) && players.length > 1) {
      next = (next + 1) % players.length;
    }
    setCurrentPresidentIndex(next);
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

    // Prevent duplicate saves
  const alreadySaved = history.some(entry => 
    entry.playedAt === new Date().toISOString().slice(0, 16) // rough check
  );

  if (alreadySaved) {
    alert("This game has already been saved.");
    return;
  }

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
    alert("Game result saved successfully!");
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

  const peekNextThreePolicies = () => {
  if (deck.length < 3) {
    alert("Not enough policies left in the deck.");
    return;
  }
  
  const peeked = deck.slice(0, 3);
  alert(`Next 3 Policies (top to bottom):\n\n1. ${peeked[0].toUpperCase()}\n2. ${peeked[1].toUpperCase()}\n3. ${peeked[2].toUpperCase()}`);
  // Does NOT remove them from deck
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
{step === "reveal" && currentPlayer && roleView && (
  <section className={`panel role-panel role-${roleView.theme}`}>
    <h2>{roleView.heading}</h2>
    
    {roleView.theme === "liberal" && (
      <div style={{ margin: "20px 0", padding: "16px", background: "rgba(255,255,255,0.1)", borderRadius: "8px" }}>
        <p style={{ fontSize: "1.1rem", lineHeight: "1.5" }}>
          You are a <strong>Liberal</strong>.<br/>
          Your goal is to pass 5 Liberal policies and stop Hitler from becoming Chancellor.
        </p>
        <p style={{ marginTop: "12px", fontStyle: "italic", opacity: 0.9 }}>
          Stay calm. Don't look away too quickly — fascists are watching.
        </p>
      </div>
    )}

    <div className="score-breakdown compact">
      {roleView.lines.map((line, i) => <div key={i} className="score-row"><span>{line}</span></div>)}
    </div>

    <div className="actions">
      <button type="button" className="primary" onClick={goNextPlayer}>Done - Pass to Next Player</button>
    </div>
  </section>
)}

{step === "inGame" && (
  <section className="panel">
    <h2>In-Game — Legislative Phase</h2>
    <p className="support-copy">{gameMessage}</p>

{/* PRESIDENT POWERS BOX */}
<div style={{ 
  background: "#1e3a8a", 
  color: "white", 
  padding: "16px", 
  borderRadius: "8px", 
  marginBottom: "20px",
  textAlign: "center"
}}>
  <div style={{ fontSize: "1.1rem", opacity: 0.9 }}>Current President</div>
  <div style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "8px 0" }}>
    {currentPresident?.name || "No President"}
  </div>

  <div style={{ marginTop: "16px" }}>
    <strong>Normal Powers:</strong>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
      <button type="button" className="primary" onClick={selectChancellorFromPresidentPowers}>
        Select Chancellor
      </button>
    </div>
  </div>

<div style={{ marginTop: "20px" }}>
  <strong>Special Powers:</strong>
  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
    <button type="button" className="secondary" onClick={peekNextThreePolicies} disabled={!lastEnacted?.power}>
      Peek Next 3 Policies
    </button>
    <button type="button" className="secondary" onClick={nameNextPresident} disabled={!lastEnacted?.power}>
      Name Next President
    </button>
    <button type="button" className="secondary" onClick={peekPlayerRole} disabled={!lastEnacted?.power}>
      Peek a Player's Role
    </button>
    <button type="button" className="secondary" onClick={killPlayer} disabled={!lastEnacted?.power}>
      Kill a Player
    </button>
  </div>
  {!lastEnacted?.power && <p style={{ fontSize: "0.85rem", marginTop: "8px", opacity: 0.7 }}>Special powers activate on certain Fascist policies</p>}
</div>
</div>

    {/* LEGISLATIVE PHASE */}
    <div style={{ border: "2px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
      <h3>Current Action</h3>

      {legislativeStep === "idle" && (
        <button type="button" className="secondary" onClick={handleFailedElection}>
          Failed Election (test)
        </button>
      )}

{legislativeStep === "chancellorSelect" && (
  <div>
    <p><strong>President — Select Chancellor:</strong></p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
      {availableChancellors.map(p => (
        <button 
          key={p.name} 
          onClick={() => selectChancellor(players.findIndex(pl => pl.name === p.name))}
          style={{ padding: "12px 24px" }}
        >
          {p.name}
        </button>
      ))}
    </div>
  </div>
)}

      {/* NEW: VOTING PHASE */}
{legislativeStep === "voting" && proposedChancellorIndex !== null && (
  <div style={{ 
    textAlign: "center", 
    padding: "24px", 
    background: "#1e2937", 
    borderRadius: "8px", 
    border: "2px solid #60a5fa",
    color: "white"
  }}>
    <h3>Voting on Chancellor</h3>
    <p style={{ fontSize: "1.25rem", margin: "16px 0" }}>
      Proposed Chancellor: <strong>{players[proposedChancellorIndex].name}</strong>
    </p>
    <p>Did the proposed regime get enough votes?</p>
    
    <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "24px" }}>
      <button 
        onClick={approveChancellor}
        style={{ padding: "14px 32px", fontSize: "1.1rem", background: "#22c55e", color: "white", border: "none", borderRadius: "8px" }}
      >
        Yea — Approved
      </button>

      
      <button 
        onClick={rejectChancellor}
        style={{ padding: "14px 32px", fontSize: "1.1rem", background: "#ef4444", color: "white", border: "none", borderRadius: "8px" }}
      >
        Nay — Failed Election
      </button>
    </div>
  </div>
)}

{legislativeStep === "drawn" && (
        <div style={{ 
          textAlign: "center", 
          padding: "24px", 
          background: "#1e2937", 
          borderRadius: "8px", 
          border: "2px solid #22c55e",
          color: "white"
        }}>
          <h3>Chancellor Approved</h3>
          <p><strong>{players[currentChancellorIndex!]?.name}</strong> is now Chancellor.</p>
          <button 
            type="button" 
            className="primary" 
            onClick={drawForPresident}
            style={{ marginTop: "20px", padding: "16px 32px", fontSize: "1.2rem" }}
          >
            Draw 3 Policies
          </button>
        </div>
      )}

{legislativeStep === "drawn" && drawnPolicies.length === 3 && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p style={{ fontSize: "1.2rem", marginBottom: "16px" }}>
            <strong>President — Discard one policy:</strong>
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            {drawnPolicies.map((p, i) => (
              <button 
                key={i} 
                style={{ padding: "20px 28px", fontSize: "1.3rem", minWidth: "140px", fontWeight: "bold" }} 
                className={`policy-card ${p}`} 
                onClick={() => discardPolicy(i)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {legislativeStep === "chancellorChoose" && drawnPolicies.length === 2 && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.3rem", marginBottom: "20px" }}>
            <strong>Chancellor — Choose one policy to enact:</strong>
          </p>
          <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
            {drawnPolicies.map((policy, i) => (
              <button
                key={i}
                onClick={() => chancellorChoose(i)}
                style={{
                  padding: "20px 32px",
                  fontSize: "1.4rem",
                  minWidth: "160px",
                  fontWeight: "bold",
                  background: policy === "liberal" ? "#60a5fa" : "#f87171",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                }}
              >
                {policy.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    <div>Liberal: {liberalPolicies}/5 | Fascist: {fascistPolicies}/6</div>

    {lastEnacted?.power && (
      <div className="special-power-alert">
        <strong>Special Power Triggered:</strong> {lastEnacted.power}
      </div>
    )}

    <div className="actions">
  <button type="button" className="secondary" onClick={() => reset(true)}>
    Restart with Same Players
  </button>
  <button type="button" className="primary" onClick={() => reset(false)}>
    New Game with Different Players
  </button>
</div>

  </section>
)}



        {showEnactModal && enactedThisTurn && (
          <div className="modal">
            <div className="modal-content">
              <h3>Policy Enacted</h3>
              <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{enactedThisTurn.policy.toUpperCase()}</p>
              <p>Liberal: {liberalPolicies}/5 | Fascist: {fascistPolicies}/6</p>
              {enactedThisTurn.power && <p style={{ color: "#fbbf24" }}>Special Power: {enactedThisTurn.power}</p>}
              <button onClick={() => setShowEnactModal(false)}>Continue</button>
            </div>
          </div>
        )}

{step === "summary" && (
  <section className="panel">
    <h2>Game Over — {winner === "liberal" ? "Liberals Win!" : "Fascists Win!"}</h2>

    <div style={{ margin: "20px 0" }}>
      <p><strong>Hitler was:</strong> {declaredHitler}</p>
      <p><strong>Liberals:</strong> {liberalTeam.join(", ")}</p>
      <p><strong>Fascists:</strong> {fascistTeam.join(", ")}</p>
    </div>

    <div>
      <p><strong>Final Policies:</strong> Liberal {liberalPolicies}/5 | Fascist {fascistPolicies}/6</p>
      <p><strong>Killed Players:</strong> {killedPlayers.size > 0 ? Array.from(killedPlayers).join(", ") : "None"}</p>
    </div>

    <div className="actions">
      <button type="button" className="secondary" onClick={saveGameResult}>Save Result</button>
      <button type="button" className="primary" onClick={() => reset(true)}>Play Again with Same Players</button>
      <button type="button" className="primary" onClick={() => reset(false)}>New Game</button>
    </div>
  </section>
)}
      </section>
    </main>
  );
}
export default SecretHitlerRoleReveal;