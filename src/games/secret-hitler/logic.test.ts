import { describe, expect, it } from "vitest";
import { getRoleDistribution, getRoleView, type SecretPlayer } from "./logic";

describe("secret hitler role logic", () => {
  it("returns expected role distribution for each supported player count", () => {
    expect(getRoleDistribution(5)).toEqual({ fascists: 1, hitler: 1 });
    expect(getRoleDistribution(6)).toEqual({ fascists: 1, hitler: 1 });
    expect(getRoleDistribution(7)).toEqual({ fascists: 2, hitler: 1 });
    expect(getRoleDistribution(8)).toEqual({ fascists: 2, hitler: 1 });
    expect(getRoleDistribution(9)).toEqual({ fascists: 3, hitler: 1 });
    expect(getRoleDistribution(10)).toEqual({ fascists: 3, hitler: 1 });
  });

  it("shows only partner info for hitler at 5-6 players", () => {
    const players: SecretPlayer[] = [
      { name: "Alice", role: "hitler" },
      { name: "Bob", role: "fascist" },
      { name: "Cara", role: "liberal" },
      { name: "Dane", role: "liberal" },
      { name: "Eli", role: "liberal" }
    ];

    const view = getRoleView(players, 0);
    expect(view.theme).toBe("hitler");
    expect(view.lines).toEqual(["Your Fascist partner is: Bob"]);
  });

  it("hides fascists from hitler at 7+ players", () => {
    const players: SecretPlayer[] = [
      { name: "Alice", role: "hitler" },
      { name: "Bob", role: "fascist" },
      { name: "Cara", role: "fascist" },
      { name: "Dane", role: "liberal" },
      { name: "Eli", role: "liberal" },
      { name: "Finn", role: "liberal" },
      { name: "Gia", role: "liberal" }
    ];

    const view = getRoleView(players, 0);
    expect(view.theme).toBe("hitler");
    expect(view.lines).toEqual(["No additional role information."]);
  });

  it("shows fascists both hitler and fellow fascists at 7+ players", () => {
    const players: SecretPlayer[] = [
      { name: "Alice", role: "hitler" },
      { name: "Bob", role: "fascist" },
      { name: "Cara", role: "fascist" },
      { name: "Dane", role: "liberal" },
      { name: "Eli", role: "liberal" },
      { name: "Finn", role: "liberal" },
      { name: "Gia", role: "liberal" }
    ];

    const view = getRoleView(players, 1);
    expect(view.theme).toBe("fascist");
    expect(view.lines).toEqual(["Fellow Fascists: Cara", "Hitler is: Alice"]);
  });
});