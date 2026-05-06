import { startTransition, useEffect, useMemo, useState } from "react";
import { recordGamePlayerStats } from "../../app/gamePlayerStats";
import { loadSavedPlayerNames, savePlayerNames } from "../../app/players";
import { getPlayerSelectionStats } from "../../app/playerSelectionStats";
import { CITY_OPTIONS, SCORING_CARD_LIBRARY } from "./domain/data";
import { buildFinalScore } from "./domain/scoring";
import type { EndGameScoreInput, FinalScore } from "./domain/types";
import { REQUIRED_CARD_COUNT } from "./domain/validation";

type SetupStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface PlayerState {
  name: string;
  selectedCardIds: string[];
  achievementSelections: number[];
  waterAreaFeatures: number[];
  parkAreaFeatures: number[];
  monumentCount: number;
  endGame: EndGameScoreInput;
  finalScore: FinalScore | null;
}

interface GameHistoryEntry {
  id: string;
  playedAt: string;
  city: string;
  players?: string[];
  winnerName: string;
  winnerTotal: number;
  playerCount: number;
}

const DEFAULT_PLAYER_COUNT = 2;
const HISTORY_STORAGE_KEY = "cities-scoring-history-v1";
const MAX_HISTORY_ENTRIES = 20;

type FrontTab = "setup" | "history";

const SCORING_ROUNDS = [
  { key: "achievementPoints", label: "City achievement points", prompt: "Choose the points earned in each city achievement section.", type: "achievement" },
  { key: "waterPoints", label: "Water scoring", prompt: "Enter each water area, then choose how many different features it contains. Areas with 1, 2, 3, or 4 features score 1, 3, 6, or 10 points.", type: "areas", areaKind: "water" },
  { key: "parkPoints", label: "Park scoring", prompt: "Enter each park area, then choose how many different features it contains. Areas with 1, 2, 3, or 4 features score 1, 3, 6, or 10 points.", type: "areas", areaKind: "park" },
  { key: "monumentPoints", label: "Monument points", prompt: "Enter how many monuments this player has. Each monument is worth 2 points.", type: "monuments" },
  { key: "scoringBoards", label: "Scoring cards", prompt: "For each drafted card, enter how many of that type they have.", type: "boards" }
] as const;

const STEPS = [
  "Player count",
  "Player names",
  "Starting player",
  "Choose city",
  "Drafted cards",
  "Scoring rounds",
  "Standings"
] as const;

function rotateNamesToStarter(names: string[], startingName: string): string[] {
  const startIndex = names.indexOf(startingName);
  if (startIndex === -1) {
    return names;
  }

  return [...names.slice(startIndex), ...names.slice(0, startIndex)];
}

function chooseRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createEmptyEndGame(): EndGameScoreInput {
  return {
    achievementPoints: 0,
    waterPoints: 0,
    parkPoints: 0,
    monumentPoints: 0,
    scoringBoards: Array(REQUIRED_CARD_COUNT).fill(0)
  };
}

function createPlayers(count: number, suggestedNames?: string[]): PlayerState[] {
  return Array.from({ length: count }, (_, index) => ({
    name: suggestedNames?.[index] || `Player ${index + 1}`,
    selectedCardIds: Array(REQUIRED_CARD_COUNT).fill(""),
    achievementSelections: [0, 0, 0],
    waterAreaFeatures: [],
    parkAreaFeatures: [],
    monumentCount: 0,
    endGame: createEmptyEndGame(),
    finalScore: null
  }));
}

function createPlayer(index: number, suggestedName?: string): PlayerState {
  return {
    name: suggestedName || `Player ${index + 1}`,
    selectedCardIds: Array(REQUIRED_CARD_COUNT).fill(""),
    achievementSelections: [0, 0, 0],
    waterAreaFeatures: [],
    parkAreaFeatures: [],
    monumentCount: 0,
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

function calculateCardPoints(vpValue: number | string, count: number): number {
  if (typeof vpValue === "string") {
    // Handle fractions like "1/2"
    const parts = vpValue.split("/");
    if (parts.length === 2) {
      const numerator = Number(parts[0]);
      const denominator = Number(parts[1]);
      if (!Number.isNaN(numerator) && !Number.isNaN(denominator)) {
        return Math.floor((numerator / denominator) * count);
      }
    }
  }
  return Math.floor((vpValue as number) * count);
}

function calculateAreaPoints(featureCount: number): number {
  if (featureCount <= 0) {
    return 0;
  }

  if (featureCount === 1) {
    return 1;
  }

  if (featureCount === 2) {
    return 3;
  }

  if (featureCount === 3) {
    return 6;
  }

  return 10;
}

function resizeFeatureList(existing: number[], nextCount: number): number[] {
  if (nextCount <= 0) {
    return [];
  }

  return Array.from({ length: nextCount }, (_, index) => existing[index] ?? 0);
}

function calculateAreaTotal(featureCounts: number[]): number {
  return featureCounts.reduce((sum, featureCount) => sum + calculateAreaPoints(featureCount), 0);
}

function clampCount(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
        (entry.players === undefined || (Array.isArray(entry.players) && entry.players.every((name: unknown) => typeof name === "string"))) &&
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
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [step, setStep] = useState<SetupStep>(0);
  const [nameInput, setNameInput] = useState<string>("");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [boardDraftPlayerIndex, setBoardDraftPlayerIndex] = useState<number>(0);
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [roundPlayerIndex, setRoundPlayerIndex] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<GameHistoryEntry[]>(() => loadGameHistory());
  const [savedPlayerNames, setSavedPlayerNames] = useState<string[]>(() => loadSavedPlayerNames());
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [starterSelectionMode, setStarterSelectionMode] = useState<"undecided" | "manual">("undecided");
  const [citySelectionMode, setCitySelectionMode] = useState<"undecided" | "manual">("undecided");
  const [startingPlayerName, setStartingPlayerName] = useState<string>("");
  const [startingPlayerWasRandom, setStartingPlayerWasRandom] = useState<boolean>(false);
  const [cityWasRandom, setCityWasRandom] = useState<boolean>(false);
  const [frontTab, setFrontTab] = useState<FrontTab>("setup");

  const cardLookup = useMemo(
    () => Object.fromEntries(SCORING_CARD_LIBRARY.map((card) => [card.id, card])),
    []
  );
  const cityLookup = useMemo(
    () => Object.fromEntries(CITY_OPTIONS.map((option) => [option.id, option])) as Record<string, (typeof CITY_OPTIONS)[number]>,
    []
  );

  const currentDraftPlayer = players[boardDraftPlayerIndex];
  const currentRoundPlayer = players[roundPlayerIndex];
  const currentRound = SCORING_ROUNDS[roundIndex];
  const selectedCity = city ? cityLookup[city] : undefined;
  const standings = useMemo(
    () => [...players].sort((left, right) => (right.finalScore?.total ?? 0) - (left.finalScore?.total ?? 0)),
    [players]
  );
  const runningStandings = useMemo(
    () => [...players].sort((left, right) => computeRunningTotal(right.endGame) - computeRunningTotal(left.endGame)),
    [players]
  );
  const playerStats = useMemo(
    () => getPlayerSelectionStats("cities", savedPlayerNames),
    [savedPlayerNames, history]
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
    setPlayerCount(2);
    setStep(0);
    setNameInput("");
    setSelectedNames([]);
    setPlayers([]);
    setBoardDraftPlayerIndex(0);
    setRoundIndex(0);
    setRoundPlayerIndex(0);
    setError("");
    setCardCounts({});
    setStarterSelectionMode("undecided");
    setCitySelectionMode("undecided");
    setStartingPlayerName("");
    setStartingPlayerWasRandom(false);
    setCityWasRandom(false);
    setFrontTab("setup");
  };

  const handlePlayerCountSelect = (count: number) => {
    setPlayerCount(count);
    setSelectedNames([]);
    setNameInput("");
    setError("");
    setStarterSelectionMode("undecided");
    setCitySelectionMode("undecided");
    setStartingPlayerName("");
    setStartingPlayerWasRandom(false);
    setCity("");
    setCityWasRandom(false);
    setFrontTab("setup");
    goToStep(1);
  };

  const addPlayerName = (rawName: string) => {
    const name = rawName.trim();
    if (!name || selectedNames.length >= playerCount) {
      return;
    }

    setSelectedNames((names) => [...names, name]);
    if (!savedPlayerNames.includes(name)) {
      setSavedPlayerNames((names) => [name, ...names]);
    }
    setNameInput("");
  };

  const removePlayerName = (index: number) => {
    setSelectedNames((names) => names.filter((_, nameIndex) => nameIndex !== index));
  };

  const handlePlayerNamesComplete = () => {
    if (selectedNames.length !== playerCount) {
      setError(`Select all ${playerCount} player names.`);
      return;
    }

    setPlayers(createPlayers(playerCount, selectedNames));
    savePlayerNames(selectedNames);
    setBoardDraftPlayerIndex(0);
    setRoundPlayerIndex(0);
    setStarterSelectionMode("undecided");
    setCitySelectionMode("undecided");
    setStartingPlayerName("");
    setStartingPlayerWasRandom(false);
    setCity("");
    setCityWasRandom(false);
    setError("");
    goToStep(2);
  };

  const handleStartingPlayerSelect = (nextStartingPlayer: string, wasRandom = false) => {
    const orderedNames = rotateNamesToStarter(selectedNames, nextStartingPlayer);
    setPlayers(createPlayers(playerCount, orderedNames));
    setStartingPlayerName(nextStartingPlayer);
    setStartingPlayerWasRandom(wasRandom);
    setBoardDraftPlayerIndex(0);
    setRoundPlayerIndex(0);
    setError("");
    goToStep(3);
  };

  const handleRandomStartingPlayer = () => {
    if (selectedNames.length === 0) {
      return;
    }

    handleStartingPlayerSelect(chooseRandomItem(selectedNames), true);
  };

  const handleCitySelect = (nextCity: string) => {
    setCity(nextCity);
    setCitySelectionMode("manual");
    setCityWasRandom(false);
    setError("");
    goToStep(4);
  };

  const handleRandomCitySelect = () => {
    const randomCity = chooseRandomItem([...CITY_OPTIONS]);
    setCity(randomCity.id);
    setCitySelectionMode("undecided");
    setCityWasRandom(true);
    setError("");
    goToStep(4);
  };

  const handleAchievementSelection = (sectionIndex: number, points: number) => {
    setPlayers((currentPlayers) =>
      updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => {
        const nextSelections = player.achievementSelections.map((existingPoints, existingIndex) =>
          existingIndex === sectionIndex ? points : existingPoints
        );

        return {
          ...player,
          achievementSelections: nextSelections,
          endGame: {
            ...player.endGame,
            achievementPoints: nextSelections.reduce((sum, value) => sum + value, 0)
          }
        };
      })
    );
    setError("");
  };

  const handleAreaCountChange = (areaKind: "water" | "park", nextCount: number) => {
    if (Number.isNaN(nextCount)) {
      return;
    }

    const safeCount = clampCount(nextCount, 0, 20);

    setPlayers((currentPlayers) =>
      updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => {
        const nextFeatures = resizeFeatureList(
          areaKind === "water" ? player.waterAreaFeatures : player.parkAreaFeatures,
          safeCount
        );
        const nextTotal = calculateAreaTotal(nextFeatures);

        if (areaKind === "water") {
          return {
            ...player,
            waterAreaFeatures: nextFeatures,
            endGame: {
              ...player.endGame,
              waterPoints: nextTotal
            }
          };
        }

        return {
          ...player,
          parkAreaFeatures: nextFeatures,
          endGame: {
            ...player.endGame,
            parkPoints: nextTotal
          }
        };
      })
    );
    setError("");
  };

  const handleAreaFeatureChange = (areaKind: "water" | "park", areaIndex: number, nextFeatureCount: number) => {
    if (Number.isNaN(nextFeatureCount)) {
      return;
    }

    const safeFeatureCount = clampCount(nextFeatureCount, 0, 4);

    setPlayers((currentPlayers) =>
      updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => {
        const existingFeatures = areaKind === "water" ? player.waterAreaFeatures : player.parkAreaFeatures;
        const nextFeatures = existingFeatures.map((featureCount, index) =>
          index === areaIndex ? safeFeatureCount : featureCount
        );
        const nextTotal = calculateAreaTotal(nextFeatures);

        if (areaKind === "water") {
          return {
            ...player,
            waterAreaFeatures: nextFeatures,
            endGame: {
              ...player.endGame,
              waterPoints: nextTotal
            }
          };
        }

        return {
          ...player,
          parkAreaFeatures: nextFeatures,
          endGame: {
            ...player.endGame,
            parkPoints: nextTotal
          }
        };
      })
    );
    setError("");
  };

  const handleMonumentCountChange = (nextCount: number) => {
    if (Number.isNaN(nextCount)) {
      return;
    }

    const safeCount = clampCount(nextCount, 0, 20);

    setPlayers((currentPlayers) =>
      updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => ({
        ...player,
        monumentCount: safeCount,
        endGame: {
          ...player.endGame,
          monumentPoints: safeCount * 2
        }
      }))
    );
    setError("");
  };

  const handleCardCountChange = (cardKey: string, boardIndex: number, vpValue: number | string, nextCount: number) => {
    if (Number.isNaN(nextCount)) {
      return;
    }

    const safeCount = clampCount(nextCount, 0, 99);
    const newCardCounts = { ...cardCounts, [cardKey]: safeCount };
    setCardCounts(newCardCounts);

    const points = calculateCardPoints(vpValue, safeCount);
    setPlayers((currentPlayers) =>
      updatePlayerAt(currentPlayers, roundPlayerIndex, (player) => ({
        ...player,
        endGame: {
          ...player.endGame,
          scoringBoards: player.endGame.scoringBoards.map((oldPoints, currentBoardIndex) =>
            currentBoardIndex === boardIndex ? points : oldPoints
          )
        }
      }))
    );
    setError("");
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
    setCardCounts({});
    setError("");
    goToStep(5);
  };

  const handleRoundContinue = () => {
    if (currentRound.type === "boards" && currentRoundPlayer.selectedCardIds.some((cardId) => !cardId)) {
      setError("Choose each drafted card before entering scoring card points.");
      return;
    }

    if (currentRound.type === "areas") {
      const featureCounts = currentRound.areaKind === "water"
        ? currentRoundPlayer.waterAreaFeatures
        : currentRoundPlayer.parkAreaFeatures;

      if (featureCounts.some((featureCount) => featureCount < 1)) {
        setError(`Choose the number of different features for each ${currentRound.areaKind} area.`);
        return;
      }
    }

    if (roundPlayerIndex < players.length - 1) {
      setRoundPlayerIndex((index) => index + 1);
      setCardCounts({});
      setError("");
      return;
    }

    if (roundIndex < SCORING_ROUNDS.length - 1) {
      setRoundIndex((index) => index + 1);
      setRoundPlayerIndex(0);
      setCardCounts({});
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
        recordGamePlayerStats({
          gameId: "cities",
          players: finalizedPlayers.map((player) => player.name),
          winners: [winner.name],
          numericStatsByPlayer: {
            [winner.name]: {
              highScore: winner.finalScore.total,
              winningScoreTotal: winner.finalScore.total,
              winningScoreCount: 1
            }
          }
        });
        setHistory((currentHistory) => [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            playedAt: new Date().toISOString(),
            city,
            players: finalizedPlayers.map((player) => player.name),
            winnerName: winner.name,
            winnerTotal: winner.finalScore.total,
            playerCount: finalizedPlayers.length
          },
          ...currentHistory
        ].slice(0, MAX_HISTORY_ENTRIES));
      }

      setError("");
      goToStep(6);
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
          <section className="panel" aria-labelledby="count-heading">
            <div className="panel-tabs" role="tablist" aria-label="Cities front page tabs">
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
                <h2 id="count-heading">How many players?</h2>
                <div className="game-grid">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`city-tile${playerCount === count ? " selected" : ""}`}
                      onClick={() => handlePlayerCountSelect(count)}
                    >
                      <span className="city-code">{count}</span>
                      <span>{count} {count === 1 ? "player" : "players"}</span>
                    </button>
                  ))}
                </div>
                <div className="actions">
                  <button type="button" className="secondary" onClick={onBackHome}>
                    Back to game hub
                  </button>
                </div>
              </>
            ) : history.length > 0 ? (
              <div className="history-cards">
                {history.map((entry) => (
                  <div key={entry.id} className="history-card">
                    <div className="hc-header">
                      <span className="winner-badge wb-liberal">{entry.winnerName} won</span>
                      <span className="hc-date">{new Date(entry.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="hc-details">
                      <span className="hc-label">City</span>
                      <span className="hc-value">{entry.city}</span>
                      <span className="hc-label">Players</span>
                      <span className="hc-value">{entry.players?.join(", ") ?? `${entry.playerCount} players`}</span>
                      <span className="hc-label">Winning score</span>
                      <span className="hc-value">{entry.winnerTotal}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="support-copy">No Cities games saved yet.</p>
            )}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="panel" aria-labelledby="names-heading">
            <h2 id="names-heading">Add player names</h2>
            <p className="support-copy">Selected: {selectedNames.length}/{playerCount}</p>

            <label className="field field-wide">
              <span>Add new name</span>
              <input
                type="text"
                placeholder="Enter name"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addPlayerName(nameInput);
                  }
                }}
              />
            </label>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => addPlayerName(nameInput)}
                disabled={!nameInput.trim() || selectedNames.length >= playerCount}
              >
                Add name
              </button>
            </div>

            <h3>Players you've used before</h3>
            <div className="game-grid">
              {savedPlayerNames.length === 0 ? <p className="support-copy">No saved names yet.</p> : null}
              {savedPlayerNames.map((name) => {
                const stats = playerStats.get(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className="saved-player-card"
                    onClick={() => addPlayerName(name)}
                    disabled={selectedNames.includes(name) || selectedNames.length >= playerCount}
                  >
                    <strong>{name}</strong>
                    <span>{stats && stats.gamesPlayed > 0 ? `${stats.wins} wins • ${stats.gamesPlayed} games` : "No Cities games yet"}</span>
                  </button>
                );
              })}
            </div>

            {selectedNames.length > 0 ? (
              <>
                <h3>Current game players</h3>
                <div className="score-breakdown compact">
                  {selectedNames.map((name, index) => (
                    <div key={index} className="score-row">
                      <span>{index + 1}. {name}</span>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => removePlayerName(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div className="actions">
              <button type="button" className="secondary" onClick={() => goToStep(0)}>
                Back
              </button>
              <button type="button" className="primary" onClick={handlePlayerNamesComplete} disabled={selectedNames.length !== playerCount}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="panel" aria-labelledby="starter-heading">
            <h2 id="starter-heading">Choose the starting player</h2>
            <p className="support-copy">Do you want me to pick the starting player randomly, or do you already know who starts?</p>

            <div className="choice-row">
              <button type="button" className="primary" onClick={handleRandomStartingPlayer}>
                Pick randomly
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setStarterSelectionMode((mode) => (mode === "manual" ? "undecided" : "manual"))}
              >
                I already know
              </button>
            </div>

            {starterSelectionMode === "manual" ? (
              <div className="score-breakdown compact">
                {selectedNames.map((name) => (
                  <button key={name} type="button" className="choice-card" onClick={() => handleStartingPlayerSelect(name)}>
                    <strong>{name}</strong>
                    <span>Select {name} as the starting player</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="actions">
              <button type="button" className="secondary" onClick={() => goToStep(1)}>
                Back
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="panel" aria-labelledby="city-heading">
            <h2 id="city-heading">Choose the city</h2>
            <p className="support-copy">Starting player: {startingPlayerName}. Do you want a random city, or do you already have one?</p>

            {startingPlayerWasRandom ? (
              <p className="selection-banner">Random starting player: <strong>{startingPlayerName}</strong></p>
            ) : null}

            <div className="choice-row">
              <button type="button" className="primary" onClick={handleRandomCitySelect}>
                Pick a random city
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setCitySelectionMode((mode) => (mode === "manual" ? "undecided" : "manual"))}
              >
                We already have one
              </button>
            </div>

            {citySelectionMode === "manual" ? (
              <div className="city-grid">
                {CITY_OPTIONS.map((cityOption) => (
                  <button key={cityOption.id} type="button" className={`city-tile${city === cityOption.id ? " selected" : ""}`} onClick={() => handleCitySelect(cityOption.id)}>
                    <span className="city-code">{cityOption.skyline}</span>
                    <span>{cityOption.label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="actions">
              <button type="button" className="secondary" onClick={() => goToStep(2)}>
                Back
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="panel" aria-labelledby="points-heading">
            <h2 id="points-heading">Choose drafted cards for {currentDraftPlayer.name}</h2>
            <p className="support-copy">Starting player: {startingPlayerName}. Each player drafts 8 scoring cards from your catalog. Select the cards each player drafted before the suspense rounds begin.</p>
            <p className="selection-banner">
              {cityWasRandom ? "Random city:" : "City chosen:"} <strong>{selectedCity?.label ?? city}</strong>
            </p>
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
                        {card.name}
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
                  goToStep(3);
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

        {step === 5 ? (
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
              {currentRound.type === "achievement" && selectedCity ? (
                <div className="achievement-list">
                  {selectedCity.achievementSections.map((section, sectionIndex) => {
                    const selectedPoints = currentRoundPlayer.achievementSelections[sectionIndex] ?? 0;

                    return (
                      <div key={section.label} className="achievement-card">
                        <div>
                          <p className="achievement-label">{section.label}</p>
                          <p className="support-copy achievement-copy">Choose the point value earned for this section.</p>
                        </div>
                        <div className="achievement-options">
                          {section.points.map((points) => (
                            <button
                              key={points}
                              type="button"
                              className={`point-chip${selectedPoints === points ? " active" : ""}`}
                              onClick={() => handleAchievementSelection(sectionIndex, points)}
                            >
                              {points}
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`point-chip point-chip-muted${selectedPoints === 0 ? " active" : ""}`}
                            onClick={() => handleAchievementSelection(sectionIndex, 0)}
                          >
                            0
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="score-row achievement-row">
                    <span>Total achievement points</span>
                    <strong>{currentRoundPlayer.endGame.achievementPoints}</strong>
                  </div>
                </div>
              ) : currentRound.type === "areas" ? (
                (() => {
                  const areaLabel = currentRound.areaKind === "water" ? "water" : "park";
                  const areaFeatures = currentRound.areaKind === "water"
                    ? currentRoundPlayer.waterAreaFeatures
                    : currentRoundPlayer.parkAreaFeatures;
                  const areaTotal = currentRound.areaKind === "water"
                    ? currentRoundPlayer.endGame.waterPoints
                    : currentRoundPlayer.endGame.parkPoints;

                  return (
                    <div className="achievement-list">
                      <div className="field field-wide">
                        <span>How many different {areaLabel} areas does this player have?</span>
                        <div className="count-stepper">
                          <button
                            type="button"
                            className="pip-btn"
                            onClick={() => handleAreaCountChange(currentRound.areaKind, areaFeatures.length - 1)}
                            disabled={areaFeatures.length <= 0}
                          >
                            −
                          </button>
                          <span className="pip-count">{areaFeatures.length}</span>
                          <button
                            type="button"
                            className="pip-btn"
                            onClick={() => handleAreaCountChange(currentRound.areaKind, areaFeatures.length + 1)}
                            disabled={areaFeatures.length >= 20}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {areaFeatures.map((featureCount, areaIndex) => (
                        <div key={`${areaLabel}-area-${areaIndex}`} className="achievement-card">
                          <div>
                            <p className="achievement-label">{areaLabel === "water" ? "Water" : "Park"} area {areaIndex + 1}</p>
                            <p className="support-copy achievement-copy">How many different features are in this area?</p>
                          </div>
                          <div className="achievement-options">
                            {[1, 2, 3, 4].map((featureOption) => (
                              <button
                                key={featureOption}
                                type="button"
                                className={`point-chip${featureCount === featureOption ? " active" : ""}`}
                                onClick={() => handleAreaFeatureChange(currentRound.areaKind, areaIndex, featureOption)}
                              >
                                {featureOption}
                              </button>
                            ))}
                            <button
                              type="button"
                              className={`point-chip point-chip-muted${featureCount === 0 ? " active" : ""}`}
                              onClick={() => handleAreaFeatureChange(currentRound.areaKind, areaIndex, 0)}
                            >
                              0
                            </button>
                          </div>
                          <div className="score-row achievement-row">
                            <span>Points for this area</span>
                            <strong>{calculateAreaPoints(featureCount)}</strong>
                          </div>
                        </div>
                      ))}

                      <div className="score-row achievement-row">
                        <span>Total {areaLabel} points</span>
                        <strong>{areaTotal}</strong>
                      </div>
                    </div>
                  );
                })()
              ) : currentRound.type === "monuments" ? (
                <div className="achievement-list">
                  <div className="field field-wide">
                    <span>How many monuments does this player have?</span>
                    <div className="count-stepper">
                      <button
                        type="button"
                        className="pip-btn"
                        onClick={() => handleMonumentCountChange(currentRoundPlayer.monumentCount - 1)}
                        disabled={currentRoundPlayer.monumentCount <= 0}
                      >
                        −
                      </button>
                      <span className="pip-count">{currentRoundPlayer.monumentCount}</span>
                      <button
                        type="button"
                        className="pip-btn"
                        onClick={() => handleMonumentCountChange(currentRoundPlayer.monumentCount + 1)}
                        disabled={currentRoundPlayer.monumentCount >= 20}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="score-row achievement-row">
                    <span>Monument points at 2 each</span>
                    <strong>{currentRoundPlayer.endGame.monumentPoints}</strong>
                  </div>
                </div>
              ) : (
                <div className="input-grid">
                  {currentRoundPlayer.selectedCardIds.map((cardId, index) => {
                    const card = cardLookup[cardId];
                    const cardKey = `${currentRoundPlayer.name}-${index}`;
                    const count = cardCounts[cardKey] ?? 0;
                    const calculatedPoints = calculateCardPoints(card.vpValue, count);
                    
                    return (
                      <div key={`${currentRoundPlayer.name}-${cardId}-${index}`} className="field">
                        <label>
                          <span style={{ fontWeight: "bold" }}>{card.name}</span>
                          <span style={{ fontSize: "0.85rem", color: "#666", display: "block", marginTop: "0.25rem" }}>
                            {card.vpValue} VP per {card.perUnit}
                          </span>
                          <div className="count-stepper count-stepper-wide">
                            <button
                              type="button"
                              className="pip-btn"
                              onClick={() => handleCardCountChange(cardKey, index, card.vpValue, count - 1)}
                              disabled={count <= 0}
                            >
                              −
                            </button>
                            <span className="pip-count">{count}</span>
                            <button
                              type="button"
                              className="pip-btn"
                              onClick={() => handleCardCountChange(cardKey, index, card.vpValue, count + 1)}
                              disabled={count >= 99}
                            >
                              +
                            </button>
                          </div>
                          <span style={{ fontSize: "0.9rem", color: "#0066cc", fontWeight: "600", marginTop: "0.5rem", display: "block" }}>
                            = {calculatedPoints} pts
                          </span>
                        </label>
                      </div>
                    );
                  })}
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
                  goToStep(4);
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

        {step === 6 ? (
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
                    {player.selectedCardIds.map((cardId, index) => {
                      const card = cardLookup[cardId];
                      return (
                        <div key={`${player.name}-${cardId}-${index}`} className="score-row">
                          <span title={`${card.vpValue} VP per ${card.perUnit}`}>{card.name}</span>
                          <strong>{player.endGame.scoringBoards[index]}</strong>
                        </div>
                      );
                    })}
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