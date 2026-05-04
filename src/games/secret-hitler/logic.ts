export type SecretRole = "liberal" | "fascist" | "hitler";

export interface SecretPlayer {
  name: string;
  role: SecretRole;
}

export interface RoleDistribution {
  fascists: number;
  hitler: 1;
}

export function getRoleDistribution(playerCount: number): RoleDistribution {
  if (playerCount < 5 || playerCount > 10) {
    throw new Error("Secret Hitler supports 5 to 10 players.");
  }

  if (playerCount <= 6) {
    return { fascists: 1, hitler: 1 };
  }

  if (playerCount <= 8) {
    return { fascists: 2, hitler: 1 };
  }

  return { fascists: 3, hitler: 1 };
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function assignRoles(names: string[]): SecretPlayer[] {
  const count = names.length;
  const { fascists, hitler } = getRoleDistribution(count);

  const roles: SecretRole[] = [
    ...Array(fascists).fill("fascist"),
    ...Array(hitler).fill("hitler"),
    ...Array(count - fascists - hitler).fill("liberal")
  ];

  const shuffledRoles = shuffle(roles);

  return names.map((name, index) => ({
    name,
    role: shuffledRoles[index]
  }));
}

export interface RoleView {
  heading: string;
  theme: SecretRole;
  lines: string[];
}

export function getRoleView(players: SecretPlayer[], playerIndex: number): RoleView {
  const count = players.length;
  const current = players[playerIndex];

  if (current.role === "liberal") {
    return {
      heading: "You are a Liberal.",
      theme: "liberal",
      lines: ["No additional role information."]
    };
  }

  const fascists = players.filter((player) => player.role === "fascist");
  const hitler = players.find((player) => player.role === "hitler");

  if (current.role === "fascist") {
    if (!hitler) {
      throw new Error("Hitler must be present in the game.");
    }

    if (count <= 6) {
      return {
        heading: "You are a Fascist.",
        theme: "fascist",
        lines: [`Hitler is: ${hitler.name}`]
      };
    }

    const fellowFascists = fascists
      .filter((player) => player.name !== current.name)
      .map((player) => player.name);

    return {
      heading: "You are a Fascist.",
      theme: "fascist",
      lines: [
        `Fellow Fascists: ${fellowFascists.length > 0 ? fellowFascists.join(", ") : "None"}`,
        `Hitler is: ${hitler.name}`
      ]
    };
  }

  if (current.role === "hitler") {
    if (count <= 6) {
      const partner = fascists[0];
      return {
        heading: "You are Hitler.",
        theme: "hitler",
        lines: [partner ? `Your Fascist partner is: ${partner.name}` : "No partner information."]
      };
    }

    return {
      heading: "You are Hitler.",
      theme: "hitler",
      lines: ["No additional role information."]
    };
  }

  throw new Error("Unknown role.");
}