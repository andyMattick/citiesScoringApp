import { useState } from "react";
import CitiesScoringGame from "./games/cities/CitiesScoringGame";
import SecretHitlerRoleReveal from "./games/secret-hitler/SecretHitlerRoleReveal";

type GameRoute = "home" | "cities" | "secret-hitler";

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
                    Open Cities scorer
                  </button>
                ) : game.id === "secret-hitler" ? (
                  <button type="button" className="primary" onClick={() => setRoute("secret-hitler")}>
                    Open Secret Hitler reveal
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
