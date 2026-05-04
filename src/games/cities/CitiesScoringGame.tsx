import { startTransition, useEffect, useMemo, useState } from "react";
import { CITY_OPTIONS, SCORING_CARD_LIBRARY } from "./domain/data";
import { buildFinalScore } from "./domain/scoring";
import type { EndGameScoreInput, FinalScore } from "./domain/types";
import { REQUIRED_CARD_COUNT } from "./domain/validation";

type SetupStep = 0 | 1 | 2 | 3 | 4;

interface PlayerState {
  name: string;
  selectedCardIds: string[];
  endGame: EndGameScoreInput;
  finalScore: FinalScore | null;
}

interface GameHistoryEntry {
  id: string;
  playedAt: string;
  city: string;
  winnerName: string;
  winnerTotal: number;
  playerCount: number;
}

const DEFAULT_PLAYER_COUNT = 2;
const HISTORY_STORAGE_KEY = "cities-scoring-history-v1";
const MAX_HISTORY_ENTRIES = 15;

const SCORING_ROUNDS = [
  { key: "achievementPoints", label: "City achievement points", prompt: "How many achievement points did this player earn?", type: "single" },
  { key: "waterPoints", label: "Water scoring", prompt: "How many total points did this player score from water spaces?", type: "single" },
  { key: "parkPoints", label: "Park scoring", prompt: "How many total points did this player score from park spaces?", type: "single" },
  { key: "monumentPoints", label: "Monument points", prompt: "How many monument points did this player score?", type: "single" },
  { key: "scoringBoards", label: "Scoring cards", prompt: "Enter the points this player scored for each drafted card.", type: "boards" }
] as const;

const STEPS = [
  "Select city",
  "Players",
  "Drafted cards",
  "Scoring rounds",
  "Standings"
] as const;

function createEmptyEndGame(): EndGameScoreInput {
  return {
    achievementPoints: 0,
    waterPoints: 0,
    parkPoints: 0,
    monumentPoints: 0,
    scoringBoards: Array(REQUIRED_CARD_COUNT).fill(0)
  };
}

function createPlayers(count: number): PlayerState[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Player ${index + 1}`,
    selectedCardIds: Array(REQUIRED_CARD_COUNT).fill(""),
    endGame: createEmptyEndGame(),
    finalScore: null
  }));
}

function createPlayer(index: number): PlayerState {
  return {
    name: `Player ${index + 1}`,
    selectedCardIds: Array(REQUIRED_CARD_COUNT).fill(""),
    endGame: createEmptyEndGame(),
    finalScore: null
  };
}

function updatePlayerAt(players: PlayerState[], playerIndex: number, updater: (player: PlayerState) => PlayerState) {
  return players.map((player, index) => (index === playerIndex ? updater(player) : player));
}

function computeRunningTotal(endGame: EndGameScoreInput): number {
  const scoringCardTotal = endGame.scoringBoards.reduce((sum, points) => sum + points, 0);
  return (
    endGame.achievementPoints +
    endGame.waterPoints +
    endGame.parkPoints +
    endGame.monumentPoints +
    scoringCardTotal
  );
}

function loadGameHistory(): GameHistoryEntry[] {
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
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.id === "string" &&
        typeof entry.playedAt === "string" &&
        typeof entry.city === "string" &&
        typeof entry.winnerName === "string" &&
        typeof entry.winnerTotal === "number" &&
        typeof entry.playerCount === "number"
      );
    });
  } catch {
    return [];
  }
}

function CitiesScoringGame({ onBackHome }: { onBackHome: () => void }) {
  const [city, setCity] = useState<string>("");
  const [playerCount, setPlayerCount] = useState<number>(DEFAULT_PLAYER_COUNT);
  const [players, setPlayers] = useState<PlayerState[]>(() => createPlayers(DEFAULT_PLAYER_COUNT));
  const [step, setStep] = useState<SetupStep>(0);
  const [boardDraftPlayerIndex, setBoardDraftPlayerIndex] = useState<number>(0);
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [roundPlayerIndex, setRoundPlayerIndex] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadGameHistory());

  const cardLookup = useMemo(
    () => Object.fromEntries(SCORING_CARD_LIBRARY.map((card) => [card.id, card.name])),
    []
  );

  const currentDraftPlayer = players[boardDraftPlayerIndex];
  const currentRoundPlayer = players[roundPlayerIndex];
  const currentRound = SCORING_ROUNDS[roundIndex];
  const standings = useMemo(
    () => [...players].sort((left, right) => (right.finalScore?.total ?? 0) - (left.finalScore?.total ?? 0)),
    [players]
  );
  const runningStandings = useMemo(
    () => [...players].sort((left, right) => computeRunningTotal(right.endGame) - computeRunningTotal(left.endGame)),
    [players]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const goToStep = (nextStep: SetupStep) => {
    startTransition(() => {
      setStep(nextStep);
    });
  };

  const resetApp = () => {
    setCity("");
    setPlayerCount(DEFAULT_PLAYER_COUNT);
    setPlayers(createPlayers(DEFAULT_PLAYER_COUNT));
    setBoardDraftPlayerIndex(0);
    setRoundIndex(0);
    setRoundPlayerIndex(0);
    setError("");
    goToStep(0);
  };

  const syncPlayerCount = (count: number) => {
    setPlayerCount(count);
    setPlayers((currentPlayers) => {
      const nextPlayers = currentPlayers.slice(0, count);
      while (nextPlayers.length < count) {
        nextPlayers.push(createPlayer(nextPlayers.length));
      }
      return nextPlayers.map((player, index) => ({
        ...player,
        name: player.name.trim() ? player.name : `Player ${index + 1}`
      }));
    });
  };

  const handleCitySelect = (nextCity: string) => {
    setCity(nextCity);
    setError("");
    goToStep(1);
  };

  const handlePlayerSetup = () => {
    const trimmedNames = players.map((player) => player.name.trim());
    if (trimmedNames.some((name) => !name)) {
      setError("Each player needs a name.");
      return;
    }

    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) => ({
        ...player,
        name: trimmedNames[index]
      }))
    );
    setBoardDraftPlayerIndex(0);
    setError("");
    goToStep(2);
  };

  const handleBoardSelection = () => {
    const selectedCardIds = currentDraftPlayer.selectedCardIds;
    if (selectedCardIds.some((cardId) => !cardId)) {
      setError("Each drafted card slot needs a card.");
      return;
    }

    if (boardDraftPlayerIndex < players.length - 1) {
      setBoardDraftPlayerIndex((index) => index + 1);
      setError("");
      return;
    }

    setRoundIndex(0);
    setRoundPlayerIndex(0);
    setError("");
    goToStep(3);
  };

  const handleRoundContinue = () => {
    if (currentRound.type === "boards" && currentRoundPlayer.selectedCardIds.some((cardId) => !cardId)) {
      setError("Choose each drafted card before entering scoring card points.");
      return;
    }

    if (roundPlayerIndex < players.length - 1) {
      setRoundPlayerIndex((index) => index + 1);
      setError("");
      return;
    }

    if (roundIndex < SCORING_ROUNDS.length - 1) {
      setRoundIndex((index) => index + 1);
      setRoundPlayerIndex(0);
      setError("");
      return;
    }

    try {
      const finalizedPlayers = players.map((player) => ({
        ...player,
        finalScore: buildFinalScore(player.endGame)
      }));
      const finalizedStandings = [...finalizedPlayers].sort(
        (left, right) => (right.finalScore?.total ?? 0) - (left.finalScore?.total ?? 0)
      );
      const winner = finalizedStandings[0];

      setPlayers(finalizedPlayers);
      if (winner?.finalScore) {
        setHistory((currentHistory) => [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            playedAt: new Date().toISOString(),
            city,
            winnerName: winner.name,
            winnerTotal: winner.finalScore.total,
            playerCount: finalizedPlayers.length
          },
          ...currentHistory
        ].slice(0, MAX_HISTORY_ENTRIES));
      }

      setError("");
      goToStep(4);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to finalize standings.");
    }
  };

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Cities score tracker</p>
          <h1>Score every player one round at a time.</h1>
          <p className="lede">
            Start with player count and names, then cycle through each scoring round for every player. Each
            player drafts 8 scoring cards from your current card catalog, and card descriptions can be refined
            as you finalize the list.
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={onBackHome}>
              Back to game hub
            </button>
          </div>
        </div>
        <div className="stepper" aria-label="Progress">
          {STEPS.map((label, index) => (
            <div key={label} className={`step-chip${index === step ? " active" : ""}${index < step ? " done" : ""}`}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        {step === 0 ? (
          <section className="panel" aria-labelledby="city-heading">
            <h2 id="city-heading">Select your city</h2>
            <div className="city-grid">
              {CITY_OPTIONS.map((cityOption) => (
                <button key={cityOption.id} type="button" className={`city-tile${city === cityOption.id ? " selected" : ""}`} onClick={() => handleCitySelect(cityOption.id)}>
                  <span className="city-code">{cityOption.skyline}</span>
                  <span>{cityOption.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="panel" aria-labelledby="players-heading">
            <h2 id="players-heading">How many players and what are their names?</h2>
            <div className="player-setup">
              <label className="field field-wide">
                <span>Player count</span>
                <select value={playerCount} onChange={(event) => syncPlayerCount(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="input-grid">
              {players.map((player, index) => (
                <label key={index} className="field">
                  <span>Player {index + 1} name</span>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(event) => {
                      setPlayers((currentPlayers) =>
                        updatePlayerAt(currentPlayers, index, (currentPlayer) => ({
                          ...currentPlayer,
                          name: event.target.value
                        }))
                      );
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => goToStep(0)}>
                Back
              </button>
              <button type="button" className="primary" onClick={handlePlayerSetup}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="panel" aria-labelledby="points-heading">
            <h2 id="points-heading">Choose drafted cards for {currentDraftPlayer.name}</h2>
            <p className="support-copy">Each player drafts 8 scoring cards from your catalog. Select the cards each player drafted before the suspense rounds begin.</p>
            <div className="input-grid">
              {currentDraftPlayer.selectedCardIds.map((cardId, index) => (
                <label key={`${currentDraftPlayer.name}-${index}`} className="field">
                  <span>Drafted card {index + 1}</span>
                  <select
                    value={cardId}
                    onChange={(event) => {
                      setPlayers((currentPlayers) =>
                        updatePlayerAt(currentPlayers, boardDraftPlayerIndex, (player) => ({
                          ...player,
                          selectedCardIds: player.selectedCardIds.map((existingCardId, existingIndex) =>
                            existingIndex === index ? event.target.value : existingCardId
                          )
                        }))
                      );
                    }}
                  >
                    <option value="">Select a card</option>
                    {SCORING_CARD_LIBRARY.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}{card.description ? ` - ${card.description}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (boardDraftPlayerIndex > 0) {
                    setBoardDraftPlayerIndex((index) => index - 1);
                    return;
                  }
                  goToStep(1);
                }}
              >
                Back
              </button>
              <button type="button" className="primary" onClick={handleBoardSelection}>
                {boardDraftPlayerIndex === players.length - 1 ? "Start scoring rounds" : "Next player"}
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="panel" aria-labelledby="totals-heading">
            <div className="round-banner">
              <p className="eyebrow">Round {roundIndex + 1} of {SCORING_ROUNDS.length}</p>
              <h2 id="totals-heading">{currentRound.label}</h2>
              <p className="support-copy">{currentRound.prompt}</p>
            </div>
            <div className="turn-card">
              <p className="turn-label">Now scoring</p>
              <h3>{currentRoundPlayer.name}</h3>
              <p className="support-copy">Running score: {computeRunningTotal(currentRoundPlayer.endGame)}</p>
              {currentRound.type === "single" ? (
                <label className="field field-wide">
                  <span>{currentRound.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={currentRoundPlayer.endGame[currentRound.key] as number}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      if (Number.isNaN(nextValue)) {
                        return;
                      }

                      setPlayers((currentPlayers) =>
                        updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => ({
                          ...player,
                          endGame: {
                            ...player.endGame,
                            [currentRound.key]: nextValue
                          }
                        }))
                      );
                      setError("");
                    }}
                  />
                </label>
              ) : (
                <div className="input-grid">
                  {currentRoundPlayer.selectedCardIds.map((cardId, index) => (
                    <label key={`${currentRoundPlayer.name}-${cardId}-${index}`} className="field">
                      <span>{cardLookup[cardId] ?? cardId}</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={1}
                        value={currentRoundPlayer.endGame.scoringBoards[index]}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          if (Number.isNaN(nextValue)) {
                            return;
                          }

                          setPlayers((currentPlayers) =>
                            updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => ({
                              ...player,
                              endGame: {
                                ...player.endGame,
                                scoringBoards: player.endGame.scoringBoards.map((points, boardIndex) =>
                                  boardIndex === index ? nextValue : points
                                )
                              }
                            }))
                          );
                          setError("");
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="round-progress" aria-label="Players scored this round">
              {players.map((player, index) => (
                <div key={player.name} className={`round-chip${index === roundPlayerIndex ? " active" : ""}${index < roundPlayerIndex ? " done" : ""}`}>
                  <span>{index + 1}</span>
                  <strong>{player.name}</strong>
                  <em>{computeRunningTotal(player.endGame)} pts</em>
                </div>
              ))}
            </div>
            <div className="score-breakdown compact">
              {runningStandings.map((player, index) => (
                <div key={`${player.name}-running`} className="score-row">
                  <span>{index + 1}. {player.name}</span>
                  <strong>{computeRunningTotal(player.endGame)}</strong>
                </div>
              ))}
            </div>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (roundPlayerIndex > 0) {
                    setRoundPlayerIndex((index) => index - 1);
                    return;
                  }

                  if (roundIndex > 0) {
                    setRoundIndex((index) => index - 1);
                    setRoundPlayerIndex(players.length - 1);
                    return;
                  }

                  setBoardDraftPlayerIndex(players.length - 1);
                  goToStep(2);
                }}
              >
                Back
              </button>
              <button type="button" className="primary" onClick={handleRoundContinue}>
                {roundIndex === SCORING_ROUNDS.length - 1 && roundPlayerIndex === players.length - 1
                  ? "Reveal standings"
                  : "Next turn"}
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="panel final-panel" aria-labelledby="final-heading">
            <h2 id="final-heading">Final standings</h2>
            <p className="final-city">{city}</p>
            <p className="support-copy">Every round is locked in. Now reveal who won.</p>
            <div className="score-breakdown">
              {standings.map((player, index) => (
                <div key={player.name} className={`score-row${index === 0 ? " winner-row" : ""}`}>
                  <span>{index + 1}. {player.name}</span>
                  <strong>{player.finalScore?.total ?? 0}</strong>
                </div>
              ))}
            </div>
            <div className="standings-grid">
              {standings.map((player) => (
                <article key={`${player.name}-detail`} className="standings-card">
                  <h3>{player.name}</h3>
                  <p className="standings-total">{player.finalScore?.total ?? 0}</p>
                  <div className="score-breakdown compact">
                    <div className="score-row"><span>Achievement</span><strong>{player.endGame.achievementPoints}</strong></div>
                    <div className="score-row"><span>Water</span><strong>{player.endGame.waterPoints}</strong></div>
                    <div className="score-row"><span>Park</span><strong>{player.endGame.parkPoints}</strong></div>
                    <div className="score-row"><span>Monuments</span><strong>{player.endGame.monumentPoints}</strong></div>
                    {player.selectedCardIds.map((cardId, index) => (
                      <div key={`${player.name}-${cardId}-${index}`} className="score-row">
                        <span>{cardLookup[cardId] ?? cardId}</span>
                        <strong>{player.endGame.scoringBoards[index]}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <section className="history-panel" aria-labelledby="history-heading">
              <h3 id="history-heading">Previous games (saved locally)</h3>
              {history.length === 0 ? (
                <p className="support-copy">No saved games yet.</p>
              ) : (
                <div className="score-breakdown compact">
                  {history.map((entry) => (
                    <div key={entry.id} className="score-row">
                      <span>
                        {new Date(entry.playedAt).toLocaleString()} - {entry.city} - {entry.playerCount} players
                      </span>
                      <strong>{entry.winnerName}: {entry.winnerTotal}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div className="actions">
              <button type="button" className="secondary" onClick={resetApp}>
                Score another game
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default CitiesScoringGame;