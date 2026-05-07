import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the game hub screen", () => {
    const { asFragment } = render(<App />);
    expect(screen.getByRole("heading", { name: "Select a game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cities scorer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reveal Secret Hitler roles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Long Shot companion" })).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it("walks through the Cities setup flow and reaches scoring", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Cities scorer" }));
    await user.click(screen.getByRole("button", { name: /2 players/i }));

    const nameInput = screen.getByRole("textbox");
    await user.clear(nameInput);
    await user.type(nameInput, "Alice");
    await user.click(screen.getByRole("button", { name: "Add name" }));
    await user.type(screen.getByRole("textbox"), "Bob");
    await user.click(screen.getByRole("button", { name: "Add name" }));
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

    await user.click(screen.getByRole("button", { name: "I already know" }));
    await user.click(screen.getByRole("button", { name: /Alice.*starting player/i }));

    await user.click(screen.getByRole("button", { name: "We already have one" }));
    await user.click(screen.getByRole("button", { name: /Sydney/i }));

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "Card 1");
    await user.selectOptions(selects[1], "Card 2");
    await user.selectOptions(selects[2], "Card 3");
    await user.selectOptions(selects[3], "Card 4");
    await user.selectOptions(selects[4], "Card 5");
    await user.selectOptions(selects[5], "Card 6");
    await user.selectOptions(selects[6], "Card 7");
    await user.selectOptions(selects[7], "Card 8");
    await user.click(screen.getByRole("button", { name: /Next player/i }));

    const secondPlayerSelects = screen.getAllByRole("combobox");
    await user.selectOptions(secondPlayerSelects[0], "Card 1");
    await user.selectOptions(secondPlayerSelects[1], "Card 2");
    await user.selectOptions(secondPlayerSelects[2], "Card 3");
    await user.selectOptions(secondPlayerSelects[3], "Card 4");
    await user.selectOptions(secondPlayerSelects[4], "Card 5");
    await user.selectOptions(secondPlayerSelects[5], "Card 6");
    await user.selectOptions(secondPlayerSelects[6], "Card 7");
    await user.selectOptions(secondPlayerSelects[7], "Card 8");
    await user.click(screen.getByRole("button", { name: /Start scoring rounds/i }));

    expect(screen.getByRole("heading", { name: "City achievement points" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next turn/i })).toBeInTheDocument();
  });
});