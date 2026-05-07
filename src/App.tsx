import { useState } from "react";
import CitiesScoringGame from "./games/cities/CitiesScoringGame";
import LongShotGame from "./games/long-shot/LongShotGame";
import SecretHitlerRoleReveal from "./games/secret-hitler/SecretHitlerRoleReveal";
import PlayersHub from "./app/PlayersHub";
import "./app/registerHistorians"; // Ensure historians are registered on app load

type GameRoute = "home" | "cities" | "secret-hitler" | "long-shot" | "players";

interface GameOption {
  id: string;
  name: string;
  status: "available" | "coming-soon";
  subtitle: string;
}

const GAME_OPTIONS: GameOption[] = [
  {
    id: "cities",
    name: "Cities Board Game",
    status: "available",
    subtitle: "Multiplayer end-game scoring with round-by-round suspense"
  },
  {
    id: "secret-hitler",
    name: "Secret Hitler",
    status: "available",
    subtitle: "Touch-only pass-the-phone role reveal"
  },
  {
    id: "long-shot",
    name: "Long Shot: The Dice Game",
    status: "available",
    subtitle: "Dice roller and end-game scoring companion"
  },
  { id: "ticket-to-ride", name: "Ticket to Ride", status: "coming-soon", subtitle: "Route and objective scoring" },
  { id: "cascadia", name: "Cascadia", status: "coming-soon", subtitle: "Habitat and wildlife scoring" },
  { id: "azul", name: "Azul", status: "coming-soon", subtitle: "Wall placement and penalty scoring" },
  { id: "sagrada", name: "Sagrada", status: "coming-soon", subtitle: "Dice window and objective scoring" },
  { id: "wingspan", name: "Wingspan", status: "coming-soon", subtitle: "Eggs, birds, and bonus cards" },
  { id: "splendor", name: "Splendor", status: "coming-soon", subtitle: "Prestige points and nobles" },
  { id: "terraforming-mars", name: "Terraforming Mars", status: "coming-soon", subtitle: "TR and end-game awards" }
];

function App() {
  const [route, setRoute] = useState<GameRoute>("home");

  if (route === "cities") {
    return <CitiesScoringGame onBackHome={() => setRoute("home")} />;
  }

  if (route === "secret-hitler") {
    return <SecretHitlerRoleReveal onBackHome={() => setRoute("home")} />;
  }

  if (route === "long-shot") {
    return <LongShotGame onBackHome={() => setRoute("home")} />;
  }

  if (route === "players") {
    return <PlayersHub onBack={() => setRoute("home")} />;
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Board game score hub</p>
          <h1>Choose a game and jump straight to scoring.</h1>
          <p className="lede">
            Build one scoring companion per game in this workspace. Cities is ready now, and the rest can be
            added behind the same home screen.
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setRoute("players")}>
              View Players
            </button>
          </div>
        </div>

        <section className="panel" aria-labelledby="games-heading">
          <h2 id="games-heading">Select a game</h2>
          <div className="game-grid">
            {GAME_OPTIONS.map((game) => (
              <article key={game.id} className={`game-card${game.status === "available" ? " available" : ""}`}>
                <p className="eyebrow">{game.status === "available" ? "Ready" : "Coming soon"}</p>
                <h3>{game.name}</h3>
                <p className="support-copy">{game.subtitle}</p>
                {game.id === "cities" ? (
                  <button type="button" className="primary" onClick={() => setRoute("cities")}>
                    Cities scorer
                  </button>
                ) : game.id === "secret-hitler" ? (
                  <button type="button" className="primary" onClick={() => setRoute("secret-hitler")}>
                    Reveal Secret Hitler roles
                  </button>
                ) : game.id === "long-shot" ? (
                  <button type="button" className="primary" onClick={() => setRoute("long-shot")}>
                    Open Long Shot companion
                  </button>
                ) : (
                  <button type="button" className="secondary" disabled>
                    Coming soon
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
