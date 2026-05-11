import { useEffect, useMemo, useState } from 'react';
import { deletePlayerName, loadSavedPlayerNames, savePlayerNames } from '../../app/players';
import { getPlayerSelectionStats } from '../../app/playerSelectionStats';
import { recordGamePlayerStats } from '../../app/gamePlayerStats';
import { DJINNS, DJINN_BY_ID } from './domain/data';
import {
  SCORING_CATEGORY_ORDER,
  SCORING_CATEGORY_LABELS,
  emptyPlayerScoring,
  type FiveTribesPlayer,
  type FiveTribesPlayerScoring,
  type FiveTribesScoringCategory,
} from './domain/types';
import { recomputeAllScores, rankPlayers } from './domain/scoring';
import type { FiveTribesHistoryEntry } from './historian';
import { FIVE_TRIBES_STORAGE_KEY } from './historian';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY_ITEMS = 20;
const PLAYER_COUNT_OPTIONS = [2, 3, 4] as const;
const FIVE_TRIBES_PLAYER_STATS_STORAGE_KEY = 'game-player-stats-five-tribes-v1';

const PLAYER_COLOR_THEMES = [
  { borderColor: 'rgba(255, 207, 139, 0.55)', bannerBackground: 'linear-gradient(140deg, rgba(255, 207, 139, 0.24), rgba(255, 169, 77, 0.14))', chipBackground: 'rgba(255, 207, 139, 0.14)', textColor: '#fff4e1' },
  { borderColor: 'rgba(130, 206, 255, 0.56)', bannerBackground: 'linear-gradient(140deg, rgba(130, 206, 255, 0.23), rgba(92, 155, 196, 0.14))',  chipBackground: 'rgba(130, 206, 255, 0.12)', textColor: '#e8f6ff' },
  { borderColor: 'rgba(154, 232, 168, 0.56)', bannerBackground: 'linear-gradient(140deg, rgba(154, 232, 168, 0.24), rgba(106, 188, 121, 0.14))', chipBackground: 'rgba(154, 232, 168, 0.12)', textColor: '#ebffef' },
  { borderColor: 'rgba(255, 174, 168, 0.56)', bannerBackground: 'linear-gradient(140deg, rgba(255, 174, 168, 0.24), rgba(224, 127, 114, 0.14))', chipBackground: 'rgba(255, 174, 168, 0.12)', textColor: '#ffefed' },
  { borderColor: 'rgba(228, 188, 255, 0.56)', bannerBackground: 'linear-gradient(140deg, rgba(228, 188, 255, 0.24), rgba(172, 126, 214, 0.14))', chipBackground: 'rgba(228, 188, 255, 0.12)', textColor: '#f7ecff' },
] as const;

type Step = 'count' | 'names' | 'scoring' | 'completed';
type FrontTab = 'setup' | 'history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadHistory(): FiveTribesHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FIVE_TRIBES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createPlayer(name: string, index: number): FiveTribesPlayer {
  return { id: `player-${index}`, name, scoring: emptyPlayerScoring() };
}

function placeOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function rebuildFiveTribesLifetimeStats(historyEntries: FiveTribesHistoryEntry[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Reset Five Tribes aggregate stats, then rebuild from surviving history entries.
  window.localStorage.setItem(FIVE_TRIBES_PLAYER_STATS_STORAGE_KEY, JSON.stringify({}));

  for (const entry of historyEntries) {
    const numericStatsByPlayer = Object.fromEntries(
      entry.scores.map((score) => [
        score.name,
        {
          totalScore: score.total,
          firstCount: score.place === 1 ? 1 : 0,
          secondCount: score.place === 2 ? 1 : 0,
          thirdCount: score.place === 3 ? 1 : 0,
        },
      ])
    );

    recordGamePlayerStats({
      gameId: 'five-tribes',
      players: entry.players,
      winners: entry.winnerNames,
      numericStatsByPlayer,
    });
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RunningLeaderboard({ players }: { players: FiveTribesPlayer[] }) {
  const ranked = rankPlayers(players);
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 8, fontSize: '0.9rem', opacity: 0.7 }}>Running totals</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ranked.map(({ player, place }) => {
          const pct = ranked[0].player.scoring.totalVp > 0
            ? (player.scoring.totalVp / ranked[0].player.scoring.totalVp) * 100
            : 0;
          return (
            <div
              key={player.id}
              style={{
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ opacity: 0.9 }}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{placeOrdinal(place)}</span>
                  {player.name}
                </span>
                <span style={{ fontWeight: 700 }}>{player.scoring.totalVp} VP</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: '#ffd97d', transition: 'width 0.3s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ScoreInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

function ScoreInput({ label, value, onChange, min = 0, max }: ScoreInputProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ flex: 1, opacity: 0.85 }}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(isNaN(n) ? 0 : Math.max(min ?? 0, n));
        }}
        style={{
          width: 72,
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          color: 'inherit',
          textAlign: 'center',
          fontSize: '1rem',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category scoring panels
// ---------------------------------------------------------------------------

interface CategoryPanelProps {
  players: FiveTribesPlayer[];
  onUpdateScoring: (playerIndex: number, patch: Partial<FiveTribesPlayerScoring>) => void;
  category: FiveTribesScoringCategory;
}

function GoldPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">Each gold coin is worth 1 VP.</p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="Gold coins"
            value={p.scoring.goldCoins}
            onChange={(v) => onUpdateScoring(i, { goldCoins: v })}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpGold} VP</p>
        </div>
      ))}
    </>
  );
}

function ViziersPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">
        1 VP per yellow meeple, plus 10 VP for each opponent with <em>strictly fewer</em> viziers than you.
      </p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="Yellow meeples"
            value={p.scoring.viziersCount}
            onChange={(v) => onUpdateScoring(i, { viziersCount: v })}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpViziers} VP (includes rivalry bonus)</p>
        </div>
      ))}
    </>
  );
}

function EldersPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">Each white meeple (Elder) is worth 2 VP.</p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="White meeples"
            value={p.scoring.eldersCount}
            onChange={(v) => onUpdateScoring(i, { eldersCount: v })}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpElders} VP</p>
        </div>
      ))}
    </>
  );
}

function DjinnsPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  // Track which djinn IDs are already claimed by another player
  const claimedByOthers = (playerIndex: number): Set<string> => {
    const claimed = new Set<string>();
    players.forEach((p, i) => {
      if (i !== playerIndex) p.scoring.djinnIds.forEach((id) => claimed.add(id));
    });
    return claimed;
  };

  return (
    <>
      <p className="support-copy">
        Select each Djinn owned by each player. VP values are listed next to each Djinn's name.
      </p>
      {players.map((p, i) => {
        const reserved = claimedByOthers(i);
        const selected = new Set(p.scoring.djinnIds);
        return (
          <div key={p.id} style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              {p.name} — {p.scoring.vpDjinns} VP
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {DJINNS.map((djinn) => {
                const isSelected = selected.has(djinn.id);
                const isUnavailable = !isSelected && reserved.has(djinn.id);
                return (
                  <button
                    key={djinn.id}
                    type="button"
                    onClick={() => {
                      if (isUnavailable) return;
                      const next = isSelected
                        ? p.scoring.djinnIds.filter((id) => id !== djinn.id)
                        : [...p.scoring.djinnIds, djinn.id];
                      onUpdateScoring(i, { djinnIds: next });
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: isSelected
                        ? '1px solid rgba(255,255,100,0.7)'
                        : '1px solid rgba(255,255,255,0.15)',
                      background: isSelected
                        ? 'rgba(255,255,100,0.15)'
                        : isUnavailable
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.07)',
                      color: isUnavailable ? 'rgba(255,255,255,0.3)' : 'inherit',
                      cursor: isUnavailable ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{djinn.name}</span>
                    <br />
                    <span style={{ opacity: 0.7 }}>{djinn.baseVp} VP</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

function TilesPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">Enter the total VP printed on all tiles each player controls.</p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="Tile VP total"
            value={p.scoring.tileVpSum}
            onChange={(v) => onUpdateScoring(i, { tileVpSum: v })}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpTiles} VP</p>
        </div>
      ))}
    </>
  );
}

function PalmTreesPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">Each palm tree on a controlled tile is worth 3 VP.</p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="Palm trees"
            value={p.scoring.palmTreeCount}
            onChange={(v) => onUpdateScoring(i, { palmTreeCount: v })}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpPalmTrees} VP</p>
        </div>
      ))}
    </>
  );
}

function PalacesPanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">Each palace on a controlled tile is worth 5 VP.</p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="Palaces"
            value={p.scoring.palaceCount}
            onChange={(v) => onUpdateScoring(i, { palaceCount: v })}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpPalaces} VP</p>
        </div>
      ))}
    </>
  );
}

const MERCH_TABLE = [0, 1, 3, 7, 13, 21, 30, 40, 50, 60];

function MerchandisePanel({ players, onUpdateScoring }: CategoryPanelProps) {
  return (
    <>
      <p className="support-copy">
        Score by number of unique merchandise suits (excluding slaves):
        {' '}{MERCH_TABLE.map((vp, i) => `${i}→${vp}`).join(', ')} VP.
      </p>
      {players.map((p, i) => (
        <div key={p.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</p>
          <ScoreInput
            label="Unique suits"
            value={p.scoring.uniqueMerchSuits}
            onChange={(v) => onUpdateScoring(i, { uniqueMerchSuits: Math.min(v, 9) })}
            max={9}
          />
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>= {p.scoring.vpMerchandise} VP</p>
        </div>
      ))}
    </>
  );
}

const CATEGORY_PANEL_MAP: Record<FiveTribesScoringCategory, React.ComponentType<CategoryPanelProps>> = {
  gold:        GoldPanel,
  viziers:     ViziersPanel,
  elders:      EldersPanel,
  djinns:      DjinnsPanel,
  tiles:       TilesPanel,
  palm_trees:  PalmTreesPanel,
  palaces:     PalacesPanel,
  merchandise: MerchandisePanel,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FiveTribesGame({ onBackHome }: { onBackHome: () => void }) {
  const [step, setStep] = useState<Step>('count');
  const [frontTab, setFrontTab] = useState<FrontTab>('setup');
  const [playerCount, setPlayerCount] = useState(2);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [savedNames, setSavedNames] = useState<string[]>(() => loadSavedPlayerNames());
  const [players, setPlayers] = useState<FiveTribesPlayer[]>([]);

  const [startingPlayerName, setStartingPlayerName] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [history, setHistory] = useState<FiveTribesHistoryEntry[]>(() => loadHistory());
  const [error, setError] = useState('');
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [isGameSaved, setIsGameSaved] = useState(false);

  const selectionStats = useMemo(
    () => getPlayerSelectionStats('five-tribes', savedNames),
    [savedNames, history]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(FIVE_TRIBES_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const updatePlayerScoring = (playerIndex: number, patch: Partial<FiveTribesPlayerScoring>) => {
    setPlayers((current) => {
      const next = current.map((p, i) =>
        i === playerIndex ? { ...p, scoring: { ...p.scoring, ...patch } } : p
      );
      return recomputeAllScores(next);
    });
    setIsGameSaved(false);
  };

  const addName = (rawName: string) => {
    const name = rawName.trim();
    if (!name || selectedNames.length >= playerCount || selectedNames.includes(name)) return;
    setSelectedNames((cur) => [...cur, name]);
    if (!savedNames.includes(name)) setSavedNames((cur) => [name, ...cur]);
    setNameInput('');
  };

  const removeNameAt = (index: number) => {
    setSelectedNames((cur) => cur.filter((_, i) => i !== index));
  };

  const handleDeleteSavedPlayer = (name: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete ${name} from saved players?`)) return;
    deletePlayerName(name);
    setSavedNames((cur) => cur.filter((n) => n !== name));
  };

  const resetGame = () => {
    setStep('count');
    setFrontTab('setup');
    setPlayerCount(2);
    setSelectedNames([]);
    setNameInput('');
    setSavedNames(loadSavedPlayerNames());
    setPlayers([]);
    setStartingPlayerName('');
    setCategoryIndex(0);
    setHistory(loadHistory());
    setError('');
    setSavedGameId(null);
    setIsGameSaved(false);
  };

  const startNewGameWithGuard = () => {
    if (!isGameSaved && typeof window !== 'undefined') {
      const proceed = window.confirm(
        'This game has not been saved yet. Starting a new game will discard these results. Continue?'
      );
      if (!proceed) {
        return;
      }
    }

    resetGame();
  };

  const handleDeleteHistoryEntry = (entryId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this Five Tribes game from history?')) {
      return;
    }

    const nextHistory = history.filter((entry) => entry.id !== entryId);
    setHistory(nextHistory);
    rebuildFiveTribesLifetimeStats(nextHistory);

    if (savedGameId === entryId) {
      setSavedGameId(null);
      setIsGameSaved(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Transitions
  // ---------------------------------------------------------------------------

  const beginSetup = () => {
    if (selectedNames.length !== playerCount) {
      setError(`Select all ${playerCount} player names.`);
      return;
    }

    savePlayerNames(selectedNames);

    const randomizedOrder = shuffleArray(selectedNames);
    const newPlayers = randomizedOrder.map((name, i) => createPlayer(name, i));

    setStartingPlayerName(randomizedOrder[0]);
    setPlayers(newPlayers);
    setCategoryIndex(0);
    setError('');
    setSavedGameId(null);
    setIsGameSaved(false);
    setStep('scoring');
  };

  const saveCompletedGame = () => {
    const finalPlayers = recomputeAllScores(players);
    const ranked = rankPlayers(finalPlayers);

    const sortedScores = ranked.map(({ player, place }) => ({
      name: player.name,
      total: player.scoring.totalVp,
      place,
    }));

    const winnerTotal = sortedScores[0]?.total ?? 0;
    const winnerNames = sortedScores.filter((s) => s.total === winnerTotal).map((s) => s.name);

    const entry: FiveTribesHistoryEntry = {
      id: savedGameId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      playedAt: new Date().toISOString(),
      players: finalPlayers.map((p) => p.name),
      scores: sortedScores,
      winnerNames,
      winnerTotal,
    };

    setPlayers(finalPlayers);

    let nextHistory: FiveTribesHistoryEntry[];
    if (savedGameId && history.some((existing) => existing.id === savedGameId)) {
      nextHistory = history.map((existing) => (existing.id === savedGameId ? entry : existing));
    } else {
      nextHistory = [entry, ...history].slice(0, MAX_HISTORY_ITEMS);
    }

    setHistory(nextHistory);
    rebuildFiveTribesLifetimeStats(nextHistory);
    setSavedGameId(entry.id);
    setIsGameSaved(true);
    setError('');
  };

  const advanceCategory = () => {
    if (categoryIndex < SCORING_CATEGORY_ORDER.length - 1) {
      setCategoryIndex((cur) => cur + 1);
    } else {
      setPlayers((current) => recomputeAllScores(current));
      setStep('completed');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const currentCategory = SCORING_CATEGORY_ORDER[categoryIndex];
  const CategoryPanel = CATEGORY_PANEL_MAP[currentCategory];
  const isLastCategory = categoryIndex === SCORING_CATEGORY_ORDER.length - 1;

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Five Tribes</p>
          <p className="lede">
            Summon Djinns, move Tribes across the sultanate, and outscore your rivals. This companion
            handles bid order, starting player, and end-game scoring — one category at a time.
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={onBackHome}>
              Back to game hub
            </button>
          </div>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        {/* ── STEP: COUNT ─────────────────────────────────────────────── */}
        {step === 'count' && (
          <section className="panel" aria-labelledby="ft-count-heading">
            <div className="panel-tabs" role="tablist" aria-label="Five Tribes tabs">
              <button
                type="button" role="tab"
                aria-selected={frontTab === 'setup'}
                className={`panel-tab${frontTab === 'setup' ? ' active' : ''}`}
                onClick={() => setFrontTab('setup')}
              >New game</button>
              <button
                type="button" role="tab"
                aria-selected={frontTab === 'history'}
                className={`panel-tab${frontTab === 'history' ? ' active' : ''}`}
                onClick={() => setFrontTab('history')}
              >Past games</button>
            </div>

            {frontTab === 'setup' ? (
              <>
                <h2 id="ft-count-heading">How many players?</h2>
                <div className="game-grid">
                  {PLAYER_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count} type="button"
                      className={`city-tile${playerCount === count ? ' selected' : ''}`}
                      onClick={() => setPlayerCount(count)}
                    >
                      <span className="city-code">{count}</span>
                      <span>{count} players</span>
                    </button>
                  ))}
                </div>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => { setSelectedNames([]); setError(''); setStep('names'); }}>
                    Continue
                  </button>
                </div>

                {savedNames.length > 0 && (
                  <>
                    <h3 className="section-subhead">Saved players</h3>
                    <div className="game-grid">
                      {savedNames.map((name) => {
                        const stats = selectionStats.get(name);
                        return (
                          <article key={name} className="game-card available">
                            <h3 style={{ marginBottom: 4 }}>{name}</h3>
                            <p className="support-copy" style={{ marginBottom: 0 }}>
                              {stats && stats.gamesPlayed > 0
                                ? `${stats.wins} win${stats.wins !== 1 ? 's' : ''} across ${stats.gamesPlayed} Five Tribes game${stats.gamesPlayed !== 1 ? 's' : ''}`
                                : 'No Five Tribes games yet'}
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
                )}
              </>
            ) : history.length > 0 ? (
              <>
                <h2>Recent Five Tribes games</h2>
                <div className="game-grid">
                  {history.map((entry) => (
                    <article key={entry.id} className="game-card available">
                      <p className="eyebrow">{new Date(entry.playedAt).toLocaleDateString()}</p>
                      <h3>{entry.winnerNames.join(' & ')} won</h3>
                      <p className="support-copy">
                        {entry.winnerTotal} VP &middot; {entry.players.length} players
                      </p>
                      <div style={{ marginTop: 8, fontSize: '0.82rem', opacity: 0.7 }}>
                        {entry.scores.map((s) => (
                          <div key={s.name}>{placeOrdinal(s.place)} — {s.name}: {s.total} VP</div>
                        ))}
                      </div>
                      <div className="actions" style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => handleDeleteHistoryEntry(entry.id)}
                        >
                          Delete game
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ opacity: 0.6, padding: '20px 0' }}>No games recorded yet.</p>
            )}
          </section>
        )}

        {/* ── STEP: NAMES ─────────────────────────────────────────────── */}
        {step === 'names' && (
          <section className="panel" aria-labelledby="ft-names-heading">
            <h2 id="ft-names-heading">Who's playing? ({selectedNames.length}/{playerCount})</h2>

            {selectedNames.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {selectedNames.map((name, i) => (
                  <span
                    key={name}
                    style={{
                      ...PLAYER_COLOR_THEMES[i % PLAYER_COLOR_THEMES.length],
                      padding: '4px 12px',
                      borderRadius: 20,
                      border: `1px solid ${PLAYER_COLOR_THEMES[i % PLAYER_COLOR_THEMES.length].borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeNameAt(i)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, opacity: 0.7 }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {selectedNames.length < playerCount && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="Player name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addName(nameInput); }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)', color: 'inherit', fontSize: '1rem',
                  }}
                />
                <button type="button" className="primary" onClick={() => addName(nameInput)}>Add</button>
              </div>
            )}

            {savedNames.filter((n) => !selectedNames.includes(n)).length > 0 && (
              <>
                <h3 className="section-subhead">Saved players</h3>
                <div className="game-grid">
                  {savedNames.filter((n) => !selectedNames.includes(n)).map((name) => (
                    <button
                      key={name} type="button"
                      className="city-tile"
                      disabled={selectedNames.length >= playerCount}
                      onClick={() => addName(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="actions">
              <button type="button" className="secondary" onClick={() => setStep('count')}>Back</button>
              <button
                type="button" className="primary"
                disabled={selectedNames.length !== playerCount}
                onClick={beginSetup}
              >
                Randomize &amp; Start Scoring
              </button>
            </div>
          </section>
        )}

        {/* ── STEP: SCORING ───────────────────────────────────────────── */}
        {step === 'scoring' && (
          <section className="panel" aria-labelledby="ft-scoring-heading">
            {/* Setup summary */}
            <div
              style={{
                marginBottom: 20, padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                fontSize: '0.85rem',
              }}
            >
              <p style={{ marginBottom: 4, fontWeight: 600 }}>
                First to place on bid track: <span style={{ color: '#ffd97d' }}>{startingPlayerName}</span>
              </p>
              <p style={{ marginBottom: 0, opacity: 0.8 }}>
                Randomized player order: {players.map((p) => p.name).join(' -> ')}.
              </p>
              <p style={{ marginBottom: 0, opacity: 0.8 }}>
                Bid track costs: 0, 1, 3, 5, 8, 12 gold — players choose their own spot.
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {SCORING_CATEGORY_ORDER.map((cat, i) => (
                  <div
                    key={cat}
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= categoryIndex ? '#ffd97d' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 4 }}>
                {categoryIndex + 1} / {SCORING_CATEGORY_ORDER.length}
              </p>
            </div>

            <RunningLeaderboard players={players} />

            <h2 id="ft-scoring-heading" style={{ marginBottom: 8 }}>
              {SCORING_CATEGORY_LABELS[currentCategory]}
            </h2>

            <CategoryPanel
              players={players}
              onUpdateScoring={updatePlayerScoring}
              category={currentCategory}
            />

            <div className="actions" style={{ marginTop: 16 }}>
              {categoryIndex > 0 && (
                <button type="button" className="secondary" onClick={() => setCategoryIndex((c) => c - 1)}>
                  Back
                </button>
              )}
              <button type="button" className="primary" onClick={advanceCategory}>
                {isLastCategory ? 'Finish & See Results' : 'Next Category →'}
              </button>
            </div>
          </section>
        )}

        {/* ── STEP: COMPLETED ─────────────────────────────────────────── */}
        {step === 'completed' && (() => {
          const ranked = rankPlayers(players);
          const categoryRows: Array<{ cat: FiveTribesScoringCategory; label: string; getVp: (s: FiveTribesPlayerScoring) => number }> = [
            { cat: 'gold',        label: 'Gold Coins',   getVp: (s) => s.vpGold },
            { cat: 'viziers',     label: 'Viziers',      getVp: (s) => s.vpViziers },
            { cat: 'elders',      label: 'Elders',       getVp: (s) => s.vpElders },
            { cat: 'djinns',      label: 'Djinns',       getVp: (s) => s.vpDjinns },
            { cat: 'tiles',       label: 'Tiles',        getVp: (s) => s.vpTiles },
            { cat: 'palm_trees',  label: 'Palm Trees',   getVp: (s) => s.vpPalmTrees },
            { cat: 'palaces',     label: 'Palaces',      getVp: (s) => s.vpPalaces },
            { cat: 'merchandise', label: 'Merchandise',  getVp: (s) => s.vpMerchandise },
          ];

          const goBackToCategory = (cat: FiveTribesScoringCategory) => {
            setCategoryIndex(SCORING_CATEGORY_ORDER.indexOf(cat));
            setStep('scoring');
            setIsGameSaved(false);
          };

          return (
            <section className="panel" aria-labelledby="ft-results-heading">
              <h2 id="ft-results-heading">Final Results</h2>

              <p style={{ marginBottom: 14, opacity: 0.75, fontSize: '0.85rem' }}>
                {isGameSaved
                  ? 'Game saved. You can still fix a category and save again to update this result.'
                  : 'Review totals, fix any category if needed, then save this game.'}
              </p>

              {/* Podium summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {ranked.map(({ player, place }, index) => {
                  const theme = PLAYER_COLOR_THEMES[players.findIndex((p) => p.id === player.id) % PLAYER_COLOR_THEMES.length];
                  return (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 10,
                        border: `1px solid ${theme.borderColor}`,
                        background: theme.bannerBackground,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        <span style={{ opacity: 0.6, marginRight: 8 }}>{placeOrdinal(place)}</span>
                        {player.name}
                        {index === 0 && <span style={{ marginLeft: 8, fontSize: '0.85rem', color: '#ffd97d' }}>🏆</span>}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{player.scoring.totalVp} VP</span>
                    </div>
                  );
                })}
              </div>

              {/* Full category breakdown table */}
              <h3 style={{ marginBottom: 10, fontSize: '0.95rem' }}>Score Breakdown</h3>
              <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', opacity: 0.6, fontWeight: 500 }}>Category</th>
                      {ranked.map(({ player }) => (
                        <th key={player.id} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>
                          {player.name}
                        </th>
                      ))}
                      <th style={{ textAlign: 'right', padding: '6px 8px', opacity: 0.5, fontWeight: 400, fontSize: '0.75rem' }}>Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map(({ cat, label, getVp }, rowIndex) => {
                      const vps = ranked.map(({ player }) => getVp(player.scoring));
                      const maxVp = Math.max(...vps);
                      return (
                        <tr
                          key={cat}
                          style={{ background: rowIndex % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                        >
                          <td style={{ padding: '6px 8px', opacity: 0.8 }}>{label}</td>
                          {ranked.map(({ player }, ci) => (
                            <td
                              key={player.id}
                              style={{
                                textAlign: 'right', padding: '6px 8px',
                                fontWeight: vps[ci] === maxVp && maxVp > 0 ? 700 : 400,
                                color: vps[ci] === maxVp && maxVp > 0 ? '#ffd97d' : 'inherit',
                              }}
                            >
                              {vps[ci]}
                            </td>
                          ))}
                          <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                            <button
                              type="button"
                              onClick={() => goBackToCategory(cat)}
                              style={{
                                background: 'none', border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 4, padding: '2px 8px', color: 'inherit',
                                cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7,
                              }}
                            >
                              Fix
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                      <td style={{ padding: '8px 8px', fontWeight: 700 }}>Total</td>
                      {ranked.map(({ player }) => (
                        <td key={player.id} style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 700 }}>
                          {player.scoring.totalVp}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="actions" style={{ marginTop: 8 }}>
                <button type="button" className="primary" onClick={saveCompletedGame}>
                  {isGameSaved ? 'Update Saved Game' : 'Save Game'}
                </button>
                <button type="button" className="secondary" onClick={onBackHome}>View Player Stats</button>
                <button type="button" className="secondary" onClick={startNewGameWithGuard}>New Five Tribes Game</button>
              </div>
            </section>
          );
        })()}
      </section>
    </main>
  );
}
