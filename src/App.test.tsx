import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the game hub screen", () => {
    const { asFragment } = render(<App />);
    expect(screen.getByRole("heading", { name: "Select a game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Cities scorer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Secret Hitler reveal" })).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it("walks through the scoring flow and shows the total", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Cities scorer" }));

    await user.click(screen.getByRole("button", { name: /Sydney/i }));

    const nameInputs = screen.getAllByRole("textbox");
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], "Alice");
    await user.clear(nameInputs[1]);
    await user.type(nameInputs[1], "Bob");
    await user.click(screen.getByRole("button", { name: /^Continue$/i }));

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

    const roundValues = [
      ["5", "4"],
      ["10", "6"],
      ["6", "3"],
      ["4", "2"]
    ];

    for (const [aliceValue, bobValue] of roundValues) {
      const currentInput = screen.getByRole("spinbutton");
      await user.clear(currentInput);
      await user.type(currentInput, aliceValue);
      await user.click(screen.getByRole("button", { name: /Next turn/i }));

      const nextInput = screen.getByRole("spinbutton");
      await user.clear(nextInput);
      await user.type(nextInput, bobValue);
      await user.click(screen.getByRole("button", { name: /Next turn/i }));
    }

    const aliceBoardInputs = screen.getAllByRole("spinbutton");
    await user.clear(aliceBoardInputs[0]);
    await user.type(aliceBoardInputs[0], "6");
    await user.clear(aliceBoardInputs[1]);
    await user.type(aliceBoardInputs[1], "4");
    await user.clear(aliceBoardInputs[2]);
    await user.type(aliceBoardInputs[2], "3");
    await user.clear(aliceBoardInputs[3]);
    await user.type(aliceBoardInputs[3], "2");
    await user.clear(aliceBoardInputs[4]);
    await user.type(aliceBoardInputs[4], "1");
    await user.clear(aliceBoardInputs[5]);
    await user.type(aliceBoardInputs[5], "1");
    await user.clear(aliceBoardInputs[6]);
    await user.type(aliceBoardInputs[6], "1");
    await user.clear(aliceBoardInputs[7]);
    await user.type(aliceBoardInputs[7], "1");
    await user.click(screen.getByRole("button", { name: /Next turn/i }));

    const bobBoardInputs = screen.getAllByRole("spinbutton");
    await user.clear(bobBoardInputs[0]);
    await user.type(bobBoardInputs[0], "4");
    await user.clear(bobBoardInputs[1]);
    await user.type(bobBoardInputs[1], "4");
    await user.clear(bobBoardInputs[2]);
    await user.type(bobBoardInputs[2], "1");
    await user.clear(bobBoardInputs[3]);
    await user.type(bobBoardInputs[3], "1");
    await user.clear(bobBoardInputs[4]);
    await user.type(bobBoardInputs[4], "1");
    await user.clear(bobBoardInputs[5]);
    await user.type(bobBoardInputs[5], "1");
    await user.clear(bobBoardInputs[6]);
    await user.type(bobBoardInputs[6], "1");
    await user.clear(bobBoardInputs[7]);
    await user.type(bobBoardInputs[7], "1");
    await user.click(screen.getByRole("button", { name: /Reveal standings/i }));

    expect(screen.getByRole("heading", { name: "Final standings" })).toBeInTheDocument();
    expect(screen.getByText(/1\. Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Bob/i)).toBeInTheDocument();
    expect(screen.getAllByText("44").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("29").length).toBeGreaterThanOrEqual(2);
  });
});