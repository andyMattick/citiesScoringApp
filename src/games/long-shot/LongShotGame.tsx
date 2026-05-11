import { useEffect, useMemo, useState } from "react";
import { recordGamePlayerStats } from "../../app/gamePlayerStats";
import { deletePlayerName, loadSavedPlayerNames, savePlayerNames } from "../../app/players";
import { getPlayerSelectionStats } from "../../app/playerSelectionStats";
import {
  HORSE_CARD_OPTIONS_BY_HORSE,
  TRACK_EVENT_LIBRARY,
  calculateLongShotScores,
  createDefaultHorses,
  randomItem,
  rollHorseDie,
  rollMovementDie,
  validateRaceResults,
  type HelmetJerseySet,
  type HorseState,
  type LongShotPlayerInput,
  type LongShotScoringConfig,
  type PlayerBet,
  type PlayerScoreBreakdown,
  type TrackEvent
} from "./logic";

type Step = "count" | "names" | "setup" | "rolling" | "results" | "players" | "leaderboard";
type FrontTab = "setup" | "history";

interface LongShotPlayerState extends LongShotPlayerInput {
  scoreBreakdown: PlayerScoreBreakdown | null;
}

interface GameHistoryEntry {
  id: string;
  playedAt: string;
  players: string[];
  scores: Array<{ name: string; total: number }>;
  winnerNames: string[];
  winnerTotal: number;
  trackEventName: string;
  jockeyConventionActive: boolean;
}

interface DiceUiState {
  currentPlayerIndex: number;
  lastHorseRoll?: number;
  lastMovementRoll?: number;
}

const HISTORY_STORAGE_KEY = "long-shot-history-v1";
const MAX_HISTORY_ITEMS = 20;
const PLAYER_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;
const PLAYER_COLOR_THEMES = [
  {
    borderColor: "rgba(255, 207, 139, 0.55)",
    bannerBackground: "linear-gradient(140deg, rgba(255, 207, 139, 0.24), rgba(255, 169, 77, 0.14))",
    chipBackground: "rgba(255, 207, 139, 0.14)",
    textColor: "#fff4e1",
    labelColor: "rgba(255, 244, 225, 0.82)"
  },
  {
    borderColor: "rgba(130, 206, 255, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(130, 206, 255, 0.23), rgba(92, 155, 196, 0.14))",
    chipBackground: "rgba(130, 206, 255, 0.12)",
    textColor: "#e8f6ff",
    labelColor: "rgba(232, 246, 255, 0.82)"
  },
  {
    borderColor: "rgba(154, 232, 168, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(154, 232, 168, 0.24), rgba(106, 188, 121, 0.14))",
    chipBackground: "rgba(154, 232, 168, 0.12)",
    textColor: "#ebffef",
    labelColor: "rgba(235, 255, 239, 0.82)"
  },
  {
    borderColor: "rgba(255, 174, 168, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(255, 174, 168, 0.24), rgba(224, 127, 114, 0.14))",
    chipBackground: "rgba(255, 174, 168, 0.12)",
    textColor: "#ffefed",
    labelColor: "rgba(255, 239, 237, 0.82)"
  },
  {
    borderColor: "rgba(228, 188, 255, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(228, 188, 255, 0.24), rgba(172, 126, 214, 0.14))",
    chipBackground: "rgba(228, 188, 255, 0.12)",
    textColor: "#f7ecff",
    labelColor: "rgba(247, 236, 255, 0.82)"
  },
  {
    borderColor: "rgba(255, 223, 135, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(255, 223, 135, 0.24), rgba(216, 178, 74, 0.14))",
    chipBackground: "rgba(255, 223, 135, 0.12)",
    textColor: "#fff7dd",
    labelColor: "rgba(255, 247, 221, 0.82)"
  },
  {
    borderColor: "rgba(133, 231, 219, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(133, 231, 219, 0.24), rgba(95, 180, 176, 0.14))",
    chipBackground: "rgba(133, 231, 219, 0.12)",
    textColor: "#e7fffc",
    labelColor: "rgba(231, 255, 252, 0.82)"
  },
  {
    borderColor: "rgba(255, 201, 152, 0.56)",
    bannerBackground: "linear-gradient(140deg, rgba(255, 201, 152, 0.24), rgba(218, 150, 94, 0.14))",
    chipBackground: "rgba(255, 201, 152, 0.12)",
    textColor: "#fff1e5",
    labelColor: "rgba(255, 241, 229, 0.82)"
  }
] as const;

function createHelmetJerseySet(index: number): HelmetJerseySet {
  return {
    id: `set-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    chosenJockeyConventionOption: "immediate_5"
  };
}

function createPlayer(name: string): LongShotPlayerState {
  return {
    name,
    cashOnHand: 0,
    bets: [],
    ownedHorseIds: [],
    helmetJerseySets: [],
    markedHorseCount: 0,
    partialGearCount: 0,
    scoreBreakdown: null
  };
}

function createPlayers(names: string[]): LongShotPlayerState[] {
  return names.map((name) => createPlayer(name));
}

function updatePlayerAt(
  players: LongShotPlayerState[],
  playerIndex: number,
  updater: (player: LongShotPlayerState) => LongShotPlayerState
): LongShotPlayerState[] {
  return players.map((player, index) => (index === playerIndex ? updater(player) : player));
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

    return parsed.filter((entry): entry is GameHistoryEntry => {
      return (
        !!entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.playedAt === "string" &&
        Array.isArray(entry.players) &&
        Array.isArray(entry.scores) &&
        Array.isArray(entry.winnerNames) &&
        typeof entry.winnerTotal === "number" &&
        typeof entry.trackEventName === "string" &&
        typeof entry.jockeyConventionActive === "boolean"
      );
    });
  } catch {
    return [];
  }
}

function createRandomizedHorseSetup(): HorseState[] {
  return createDefaultHorses().map((horse) => ({
    ...horse,
    card: randomItem(HORSE_CARD_OPTIONS_BY_HORSE[horse.id])
  }));
}

function LongShotGame({ onBackHome }: { onBackHome: () => void }) {
  const [step, setStep] = useState<Step>("count");
  const [frontTab, setFrontTab] = useState<FrontTab>("setup");
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState<string>("");
  const [savedNames, setSavedNames] = useState<string[]>(() => loadSavedPlayerNames());
  const [players, setPlayers] = useState<LongShotPlayerState[]>([]);
  const [horses, setHorses] = useState<HorseState[]>(() => createDefaultHorses());
  const [trackEvent, setTrackEvent] = useState<TrackEvent>(TRACK_EVENT_LIBRARY[0]);
  const [diceState, setDiceState] = useState<DiceUiState>({ currentPlayerIndex: 0 });
  const [playerEntryIndex, setPlayerEntryIndex] = useState<number>(0);
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadHistory());
  const [error, setError] = useState<string>("");
  const [scoringConfig, setScoringConfig] = useState<LongShotScoringConfig>({
    helmetJerseySetValue: 0,
    ownerBonusFirst: 0,
    ownerBonusSecond: 0,
    ownerBonusThird: 0
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const selectionStats = useMemo(
    () => getPlayerSelectionStats("long-shot", savedNames),
    [savedNames, history]
  );

  const currentRollingPlayer = selectedNames[diceState.currentPlayerIndex] ?? players[diceState.currentPlayerIndex]?.name ?? "";
  const currentPlayerTheme = PLAYER_COLOR_THEMES[diceState.currentPlayerIndex % PLAYER_COLOR_THEMES.length];
  const rollingPlayerThemes = selectedNames.map((name, index) => ({
    name,
    index,
    isCurrent: index === diceState.currentPlayerIndex,
    theme: PLAYER_COLOR_THEMES[index % PLAYER_COLOR_THEMES.length]
  }));
  const currentEntryPlayer = players[playerEntryIndex];
  const jockeyConventionActive = trackEvent.endgameEffectId === "jockey_convention";
  const standings = useMemo(
    () => [...players].filter((player) => player.scoreBreakdown).sort((left, right) => (right.scoreBreakdown?.total ?? 0) - (left.scoreBreakdown?.total ?? 0)),
    [players]
  );

  const addName = (rawName: string) => {
    const name = rawName.trim();
    if (!name || selectedNames.length >= playerCount || selectedNames.includes(name)) {
      return;
    }

    setSelectedNames((current) => [...current, name]);
    if (!savedNames.includes(name)) {
      setSavedNames((current) => [name, ...current]);
    }
    setNameInput("");
  };

  const removeNameAt = (index: number) => {
    setSelectedNames((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleDeleteSavedPlayer = (name: string) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete ${name} from saved players? This will not remove past game results.`)) {
      return;
    }

    deletePlayerName(name);
    setSavedNames((current) => current.filter((savedName) => savedName !== name));
  };

  const resetGame = () => {
    setStep("count");
    setFrontTab("setup");
    setPlayerCount(2);
    setSelectedNames([]);
    setNameInput("");
    setSavedNames(loadSavedPlayerNames());
    setPlayers([]);
    setHorses(createDefaultHorses());
    setTrackEvent(TRACK_EVENT_LIBRARY[0]);
    setDiceState({ currentPlayerIndex: 0 });
    setPlayerEntryIndex(0);
    setHistory(loadHistory());
    setError("");
    setScoringConfig({
      helmetJerseySetValue: 0,
      ownerBonusFirst: 0,
      ownerBonusSecond: 0,
      ownerBonusThird: 0
    });
  };

  const beginSetup = () => {
    if (selectedNames.length !== playerCount) {
      setError(`Select all ${playerCount} player names.`);
      return;
    }

    savePlayerNames(selectedNames);
    setPlayers(createPlayers(selectedNames));
    setHorses(createDefaultHorses());
    setTrackEvent(TRACK_EVENT_LIBRARY[0]);
    setDiceState({ currentPlayerIndex: 0 });
    setPlayerEntryIndex(0);
    setError("");
    setStep("setup");
  };

  const randomizeSetup = () => {
    setTrackEvent(randomItem(TRACK_EVENT_LIBRARY));
    setHorses(createRandomizedHorseSetup());
    const randomPlayerIndex = selectedNames.length > 0 ? Math.floor(Math.random() * selectedNames.length) : 0;
    setDiceState({ currentPlayerIndex: randomPlayerIndex });
  };

  const updateHorseCard = (horseId: number, cardId: string) => {
    setHorses((current) =>
      current.map((horse) => {
        if (horse.id !== horseId) {
          return horse;
        }

        const nextCard = HORSE_CARD_OPTIONS_BY_HORSE[horseId].find((option) => option.id === cardId) ?? horse.card;
        return { ...horse, card: nextCard };
      })
    );
  };

  const rollDice = () => {
    setDiceState((current) => ({
      ...current,
      lastHorseRoll: rollHorseDie(),
      lastMovementRoll: rollMovementDie()
    }));
  };

  const nextRollingPlayer = () => {
    if (selectedNames.length === 0) {
      return;
    }

    setDiceState((current) => ({
      ...current,
      currentPlayerIndex: (current.currentPlayerIndex + 1) % selectedNames.length
    }));
  };

  const continueToPlayerEntry = () => {
    const validationError = validateRaceResults(horses);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPlayerEntryIndex(0);
    setError("");
    setStep("players");
  };

  const calculateScores = () => {
    try {
      const result = calculateLongShotScores(players, horses, trackEvent, scoringConfig);
      const breakdownByPlayer = new Map(result.playerScores.map((entry) => [entry.playerId, entry]));
      const finalizedPlayers = players.map((player) => ({
        ...player,
        scoreBreakdown: breakdownByPlayer.get(player.name) ?? null
      }));
      const sortedScores = [...result.playerScores].sort((left, right) => right.total - left.total);
      const winnerTotal = sortedScores[0]?.total ?? 0;
      const winnerNames = sortedScores.filter((score) => score.total === winnerTotal).map((score) => score.playerId);
      const entry: GameHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        playedAt: new Date().toISOString(),
        players: finalizedPlayers.map((player) => player.name),
        scores: sortedScores.map((score) => ({ name: score.playerId, total: score.total })),
        winnerNames,
        winnerTotal,
        trackEventName: trackEvent.name,
        jockeyConventionActive: result.jockeyConventionActive
      };

      const numericStatsByPlayer = Object.fromEntries(
        sortedScores.map((score, index) => {
          let place = index + 1;
          if (index > 0 && score.total === sortedScores[index - 1].total) {
            place = sortedScores.findIndex((s) => s.total === score.total) + 1;
          }
          return [
            score.playerId,
            {
              totalScore:  score.total,
              firstCount:  place === 1 ? 1 : 0,
              secondCount: place === 2 ? 1 : 0,
              thirdCount:  place === 3 ? 1 : 0,
            },
          ];
        })
      );

      recordGamePlayerStats({
        gameId: "long-shot",
        players: finalizedPlayers.map((player) => player.name),
        winners: winnerNames,
        numericStatsByPlayer
      });

      setPlayers(finalizedPlayers);
      setHistory((current) => [entry, ...current].slice(0, MAX_HISTORY_ITEMS));
      setError("");
      setStep("leaderboard");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to calculate Long Shot scores.");
    }
  };

  const goToNextPlayerEntry = () => {
    if (playerEntryIndex >= players.length - 1) {
      calculateScores();
      return;
    }

    setPlayerEntryIndex((current) => current + 1);
    setError("");
  };

  const claimedHorseIdsByOthers = new Set(
    players
      .flatMap((player, index) => (index === playerEntryIndex ? [] : player.ownedHorseIds))
  );

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Long Shot companion</p>
          <p className="lede">
            This Long Shot flow reuses your saved player roster, rolls the horse and movement dice, and captures
            the endgame scoring inputs once the race is over.
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={onBackHome}>
              Back to game hub
            </button>
          </div>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        {step === "count" ? (
          <section className="panel" aria-labelledby="long-shot-count-heading">
            <div className="panel-tabs" role="tablist" aria-label="Long Shot front page tabs">
              <button
                type="button"
                role="tab"
                aria-selected={frontTab === "setup"}
                className={`panel-tab${frontTab === "setup" ? " active" : ""}`}
                onClick={() => setFrontTab("setup")}
              >
                New game
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={frontTab === "history"}
                className={`panel-tab${frontTab === "history" ? " active" : ""}`}
                onClick={() => setFrontTab("history")}
              >
                Past games
              </button>
            </div>

            {frontTab === "setup" ? (
              <>
                <h2 id="long-shot-count-heading">How many players?</h2>
                <div className="game-grid">
                  {PLAYER_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`city-tile${playerCount === count ? " selected" : ""}`}
                      onClick={() => setPlayerCount(count)}
                    >
                      <span className="city-code">{count}</span>
                      <span>{count} players</span>
                    </button>
                  ))}
                </div>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => { setSelectedNames([]); setError(""); setStep("names"); }}>
                    Continue
                  </button>
                </div>

                {savedNames.length > 0 ? (
                  <>
                    <h3 className="section-subhead">Saved Long Shot players</h3>
                    <div className="game-grid">
                      {savedNames.map((name) => {
                        const stats = selectionStats.get(name);
                        return (
                          <article key={name} className="game-card available">
                            <h3 style={{ marginBottom: 4 }}>{name}</h3>
                            <p className="support-copy" style={{ marginBottom: 0 }}>
                              {stats && stats.gamesPlayed > 0
                                ? `${stats.wins} wins across ${stats.gamesPlayed} Long Shot games`
                                : "No Long Shot games yet"}
                            </p>
                            <div className="actions" style={{ marginTop: 12 }}>
                              <button type="button" className="secondary" onClick={() => handleDeleteSavedPlayer(name)}>
                                Delete saved player
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </>
            ) : history.length > 0 ? (
              <>
                <h2>Recent Long Shot games</h2>
                <div className="game-grid">
                  {history.map((entry) => (
                    <article key={entry.id} className="game-card available">
                      <p className="eyebrow">{new Date(entry.playedAt).toLocaleDateString()}</p>
                      <h3>{entry.trackEventName}</h3>
                      <p className="support-copy">
                        {entry.winnerNames.length > 1 ? `Tie: ${entry.winnerNames.join(", ")}` : `Winner: ${entry.winnerNames[0]}`}
                      </p>
                      <div className="score-breakdown compact">
                        {entry.scores.map((score) => (
                          <div key={`${entry.id}-${score.name}`} className="score-row">
                            <span>{score.name}</span>
                            <strong>{score.total}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="support-copy">No Long Shot games saved yet.</p>
            )}
          </section>
        ) : null}

        {step === "names" ? (
          <section className="panel" aria-labelledby="long-shot-names-heading">
            <h2 id="long-shot-names-heading">Add player names</h2>
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
              <button type="button" className="primary" onClick={() => addName(nameInput)}>
                Add name
              </button>
            </div>

            <h3>Players you&apos;ve used before</h3>
            <div className="game-grid">
              {savedNames.length === 0 ? <p className="support-copy">No saved names yet.</p> : null}
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
                    <span>{stats && stats.gamesPlayed > 0 ? `${stats.wins} wins • ${stats.gamesPlayed} games` : "No Long Shot games yet"}</span>
                  </button>
                );
              })}
            </div>

            <h3>Current game players</h3>
            <div className="score-breakdown compact">
              {selectedNames.map((name, index) => (
                <div key={`${name}-${index}`} className="score-row">
                  <span>{index + 1}. {name}</span>
                  <button type="button" className="secondary" onClick={() => removeNameAt(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep("count")}>
                Back
              </button>
              <button type="button" className="primary" disabled={selectedNames.length !== playerCount} onClick={beginSetup}>
                Continue to setup
              </button>
            </div>
          </section>
        ) : null}

        {step === "setup" ? (
          <section className="panel" aria-labelledby="long-shot-setup-heading">
            <h2 id="long-shot-setup-heading">Horse and event setup</h2>
            <p className="support-copy">Choose the track event and each horse&apos;s scoring card before you start rolling.</p>

            <div className="input-grid" style={{ marginBottom: 20 }}>
              <label className="field">
                <span>Track event</span>
                <select value={trackEvent.id} onChange={(event) => setTrackEvent(TRACK_EVENT_LIBRARY.find((option) => option.id === event.target.value) ?? TRACK_EVENT_LIBRARY[0])}>
                  {TRACK_EVENT_LIBRARY.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="selection-banner">
              <strong>{trackEvent.name}</strong>
              <div>{trackEvent.description}</div>
              <div style={{ marginTop: 8 }}>
                <strong>First player:</strong> {selectedNames[diceState.currentPlayerIndex] ?? "Not selected"}
              </div>
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={randomizeSetup}>
                Randomize event, cards, and first player
              </button>
            </div>

            <div className="game-grid" style={{ marginTop: 20 }}>
              {horses.map((horse) => (
                <article key={horse.id} className="game-card">
                  <p className="eyebrow">Horse {horse.id} • Group {horse.group}</p>
                  <h3>{horse.name}</h3>
                  <label className="field">
                    <span>Horse card</span>
                    <select value={horse.card.id} onChange={(event) => updateHorseCard(horse.id, event.target.value)}>
                      {HORSE_CARD_OPTIONS_BY_HORSE[horse.id].map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </label>
                  <p className="support-copy" style={{ marginBottom: 0 }}>{horse.card.description}</p>
                </article>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep("names")}>
                Back
              </button>
              <button type="button" className="primary" onClick={() => { setError(""); setStep("rolling"); }}>
                Start rolling
              </button>
            </div>
          </section>
        ) : null}

        {step === "rolling" ? (
          <section className="panel" aria-labelledby="long-shot-rolling-heading">
            <h2 id="long-shot-rolling-heading">Dice roller</h2>
            <p className="support-copy">Players move the physical race themselves. The app only tracks the current roll and whose turn it is.</p>

            <div
              className="rolling-player-banner"
              role="status"
              aria-live="polite"
              style={{ borderColor: currentPlayerTheme.borderColor, background: currentPlayerTheme.bannerBackground }}
            >
              <span className="rolling-player-label" style={{ color: currentPlayerTheme.labelColor }}>Current player</span>
              <strong className="rolling-player-name" style={{ color: currentPlayerTheme.textColor }}>
                {currentRollingPlayer || "Select players first"}
              </strong>
            </div>

            {rollingPlayerThemes.length > 0 ? (
              <div className="rolling-player-strip" aria-label="Player turn colors">
                {rollingPlayerThemes.map((entry) => (
                  <span
                    key={entry.name}
                    className={entry.isCurrent ? "rolling-player-chip active" : "rolling-player-chip"}
                    style={{
                      borderColor: entry.theme.borderColor,
                      background: entry.theme.chipBackground,
                      color: entry.theme.textColor
                    }}
                  >
                    {entry.index + 1}. {entry.name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="selection-banner">
              <strong>{trackEvent.name}</strong>
              <div>{trackEvent.description}</div>
            </div>

            <div className="game-grid" style={{ marginTop: 20 }}>
              <article className="game-card available">
                <p className="eyebrow">Horse die</p>
                <h3 style={{ fontSize: "3rem", marginBottom: 0 }}>{diceState.lastHorseRoll ?? "—"}</h3>
              </article>
              <article className="game-card available">
                <p className="eyebrow">Movement die</p>
                <h3 style={{ fontSize: "3rem", marginBottom: 0 }}>{diceState.lastMovementRoll ?? "—"}</h3>
              </article>
            </div>

            <div className="actions">
              <button type="button" className="primary" onClick={rollDice}>
                Roll dice
              </button>
              <button type="button" className="secondary" onClick={nextRollingPlayer}>
                Next player
              </button>
              <button type="button" className="secondary" onClick={() => setStep("results")}>
                End the race!
              </button>
            </div>
          </section>
        ) : null}

        {step === "results" ? (
          <section className="panel" aria-labelledby="long-shot-results-heading">
            <h2 id="long-shot-results-heading">Race results</h2>
            <p className="support-copy">Record the finishing horses, whether each horse crossed the no-bet line, and any scoring constants your table is using.</p>

            <div className="game-grid">
              {horses.map((horse) => (
                <article key={horse.id} className="game-card">
                  <p className="eyebrow">Horse {horse.id}</p>
                  <h3>{horse.name}</h3>
                  <label className="field">
                    <span>Finish position</span>
                    <select
                      value={horse.finishPosition ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setHorses((current) => current.map((entry) => entry.id === horse.id ? {
                          ...entry,
                          finishPosition: nextValue === "" ? null : Number(nextValue) as 1 | 2 | 3
                        } : entry));
                      }}
                    >
                      <option value="">Did not finish</option>
                      <option value="1">1st</option>
                      <option value="2">2nd</option>
                      <option value="3">3rd</option>
                    </select>
                  </label>
                  <label className="field" style={{ gap: 8 }}>
                    <span>No-bet line</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={horse.crossedNoBetLine}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setHorses((current) => current.map((entry) => entry.id === horse.id ? { ...entry, crossedNoBetLine: checked } : entry));
                        }}
                      />
                      <span>Crossed the no-bet line</span>
                    </div>
                  </label>
                </article>
              ))}
            </div>

            <h3 style={{ marginTop: 24 }}>Scoring constants</h3>
            <div className="input-grid">
              <label className="field">
                <span>Helmet + jersey set value</span>
                <input
                  type="number"
                  min="0"
                  value={scoringConfig.helmetJerseySetValue}
                  onChange={(event) => setScoringConfig((current) => ({ ...current, helmetJerseySetValue: Number(event.target.value) || 0 }))}
                />
              </label>
              <label className="field">
                <span>Owner bonus for 1st place</span>
                <input
                  type="number"
                  min="0"
                  value={scoringConfig.ownerBonusFirst}
                  onChange={(event) => setScoringConfig((current) => ({ ...current, ownerBonusFirst: Number(event.target.value) || 0 }))}
                />
              </label>
              <label className="field">
                <span>Owner bonus for 2nd place</span>
                <input
                  type="number"
                  min="0"
                  value={scoringConfig.ownerBonusSecond}
                  onChange={(event) => setScoringConfig((current) => ({ ...current, ownerBonusSecond: Number(event.target.value) || 0 }))}
                />
              </label>
              <label className="field">
                <span>Owner bonus for 3rd place</span>
                <input
                  type="number"
                  min="0"
                  value={scoringConfig.ownerBonusThird}
                  onChange={(event) => setScoringConfig((current) => ({ ...current, ownerBonusThird: Number(event.target.value) || 0 }))}
                />
              </label>
            </div>

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep("rolling")}>
                Back to dice
              </button>
              <button type="button" className="primary" onClick={continueToPlayerEntry}>
                Next: player scoring
              </button>
            </div>
          </section>
        ) : null}

        {step === "players" && currentEntryPlayer ? (
          <section className="panel" aria-labelledby="long-shot-player-entry-heading">
            <h2 id="long-shot-player-entry-heading">Score inputs for {currentEntryPlayer.name}</h2>
            <p className="support-copy">Player {playerEntryIndex + 1} of {players.length}</p>

            <div className="input-grid">
              <label className="field">
                <span>Cash on hand</span>
                <input
                  type="number"
                  min="0"
                  value={currentEntryPlayer.cashOnHand}
                  onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                    ...player,
                    cashOnHand: Number(event.target.value) || 0
                  })))}
                />
              </label>
              <label className="field">
                <span>Marked horses on card</span>
                <input
                  type="number"
                  min="0"
                  value={currentEntryPlayer.markedHorseCount}
                  onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                    ...player,
                    markedHorseCount: Number(event.target.value) || 0
                  })))}
                />
              </label>
              <label className="field">
                <span>Partial gear count</span>
                <input
                  type="number"
                  min="0"
                  value={currentEntryPlayer.partialGearCount}
                  onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                    ...player,
                    partialGearCount: Number(event.target.value) || 0
                  })))}
                />
              </label>
            </div>

            <h3 style={{ marginTop: 24 }}>Bets</h3>
            <div className="score-breakdown compact">
              {currentEntryPlayer.bets.length === 0 ? <p className="support-copy">No bets added yet.</p> : null}
              {currentEntryPlayer.bets.map((bet, betIndex) => (
                <div key={`${currentEntryPlayer.name}-bet-${betIndex}`} className="score-row" style={{ gap: 12, flexWrap: "wrap" }}>
                  <label className="field" style={{ flex: 1, minWidth: 140 }}>
                    <span>Horse</span>
                    <select
                      value={bet.horseId}
                      onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                        ...player,
                        bets: player.bets.map((entry, currentBetIndex) => currentBetIndex === betIndex ? {
                          ...entry,
                          horseId: Number(event.target.value)
                        } : entry)
                      })))}
                    >
                      {horses.map((horse) => (
                        <option key={horse.id} value={horse.id}>Horse {horse.id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field" style={{ flex: 1, minWidth: 140 }}>
                    <span>Amount</span>
                    <input
                      type="number"
                      min="0"
                      value={bet.amount}
                      onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                        ...player,
                        bets: player.bets.map((entry, currentBetIndex) => currentBetIndex === betIndex ? {
                          ...entry,
                          amount: Number(event.target.value) || 0
                        } : entry)
                      })))}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                      ...player,
                      bets: player.bets.filter((_, currentBetIndex) => currentBetIndex !== betIndex)
                    })))}
                  >
                    Remove bet
                  </button>
                </div>
              ))}
            </div>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                  ...player,
                  bets: [...player.bets, { horseId: 1, amount: 0 } as PlayerBet]
                })))}
              >
                Add bet
              </button>
            </div>

            <h3 style={{ marginTop: 24 }}>Owned horses</h3>
            <div className="game-grid">
              {horses.map((horse) => {
                const checked = currentEntryPlayer.ownedHorseIds.includes(horse.id);
                const disabled = !checked && claimedHorseIdsByOthers.has(horse.id);
                return (
                  <label key={`${currentEntryPlayer.name}-horse-${horse.id}`} className={`game-card${checked ? " available" : ""}`} style={{ opacity: disabled ? 0.55 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                          ...player,
                          ownedHorseIds: event.target.checked
                            ? [...player.ownedHorseIds, horse.id].sort((left, right) => left - right)
                            : player.ownedHorseIds.filter((id) => id !== horse.id)
                        })))}
                      />
                      <strong>Horse {horse.id}</strong>
                    </div>
                    <span className="support-copy" style={{ marginBottom: 0 }}>{horse.card.name}</span>
                  </label>
                );
              })}
            </div>

            <h3 style={{ marginTop: 24 }}>Helmet and jersey sets</h3>
            <div className="score-breakdown compact">
              {currentEntryPlayer.helmetJerseySets.length === 0 ? <p className="support-copy">No completed sets entered yet.</p> : null}
              {currentEntryPlayer.helmetJerseySets.map((set, setIndex) => (
                <div key={set.id} className="score-row" style={{ gap: 12, flexWrap: "wrap" }}>
                  <span>Set {setIndex + 1}</span>
                  {jockeyConventionActive ? (
                    <label className="field" style={{ flex: 1, minWidth: 180 }}>
                      <span>Jockey Convention choice</span>
                      <select
                        value={set.chosenJockeyConventionOption ?? "immediate_5"}
                        onChange={(event) => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                          ...player,
                          helmetJerseySets: player.helmetJerseySets.map((entry) => entry.id === set.id ? {
                            ...entry,
                            chosenJockeyConventionOption: event.target.value as HelmetJerseySet["chosenJockeyConventionOption"]
                          } : entry)
                        })))}
                      >
                        <option value="immediate_5">Immediate $5 already taken</option>
                        <option value="endgame_7">Score +7 at endgame</option>
                      </select>
                    </label>
                  ) : (
                    <span className="support-copy">No Jockey Convention bonus this game.</span>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                      ...player,
                      helmetJerseySets: player.helmetJerseySets.filter((entry) => entry.id !== set.id)
                    })))}
                  >
                    Remove set
                  </button>
                </div>
              ))}
            </div>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setPlayers((current) => updatePlayerAt(current, playerEntryIndex, (player) => ({
                  ...player,
                  helmetJerseySets: [...player.helmetJerseySets, createHelmetJerseySet(player.helmetJerseySets.length)]
                })))}
              >
                Add completed set
              </button>
            </div>

            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (playerEntryIndex === 0) {
                    setStep("results");
                    return;
                  }
                  setPlayerEntryIndex((current) => current - 1);
                }}
              >
                Back
              </button>
              <button type="button" className="primary" onClick={goToNextPlayerEntry}>
                {playerEntryIndex === players.length - 1 ? "Calculate scores" : "Next player"}
              </button>
            </div>
          </section>
        ) : null}

        {step === "leaderboard" ? (
          <section className="panel final-panel" aria-labelledby="long-shot-leaderboard-heading">
            <h2 id="long-shot-leaderboard-heading">Final leaderboard</h2>
            <p className="support-copy">
              {standings.length > 0 && standings.filter((player) => (player.scoreBreakdown?.total ?? 0) === (standings[0].scoreBreakdown?.total ?? 0)).length > 1
                ? `Tie game at ${standings[0].scoreBreakdown?.total ?? 0}.`
                : standings[0]
                  ? `${standings[0].name} wins with ${standings[0].scoreBreakdown?.total ?? 0}.`
                  : "No scores available."}
            </p>

            <div className="score-breakdown" style={{ marginTop: 20 }}>
              {standings.map((player, index) => (
                <article key={player.name} className="game-card available">
                  <p className="eyebrow">{index + 1}. {player.name}</p>
                  <div className="total" style={{ fontSize: "3rem", margin: "0 0 12px" }}>{player.scoreBreakdown?.total ?? 0}</div>
                  {player.scoreBreakdown ? (
                    <div className="score-breakdown compact">
                      <div className="score-row"><span>Cash on hand</span><strong>{player.scoreBreakdown.cashOnHand}</strong></div>
                      <div className="score-row"><span>Bet payouts</span><strong>{player.scoreBreakdown.betPayouts}</strong></div>
                      <div className="score-row"><span>Bet returns</span><strong>{player.scoreBreakdown.betReturns}</strong></div>
                      <div className="score-row"><span>Owner bonuses</span><strong>{player.scoreBreakdown.ownerBonuses}</strong></div>
                      <div className="score-row"><span>Helmet / jersey base</span><strong>{player.scoreBreakdown.helmetJerseyBase}</strong></div>
                      <div className="score-row"><span>Jockey Convention bonus</span><strong>{player.scoreBreakdown.jockeyConventionBonus}</strong></div>
                      <div className="score-row"><span>Horse card bonuses</span><strong>{player.scoreBreakdown.horseCardBonuses}</strong></div>
                      <div className="score-row"><span>Horse card penalties</span><strong>-{player.scoreBreakdown.horseCardPenalties}</strong></div>
                      {player.scoreBreakdown.horseEffects.map((effect) => (
                        <div key={`${player.name}-${effect.effectId}`} className="score-row">
                          <span>{effect.effectId}</span>
                          <strong>{effect.amount}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="primary" onClick={resetGame}>
                New game
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default LongShotGame;