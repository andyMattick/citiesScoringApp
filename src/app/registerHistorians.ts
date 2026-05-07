/**
 * Game Historian Registration
 * This file registers all game historians with the registry
 * Import this in your app's main entry point to ensure historians are registered
 */

import { registerGameHistorian } from "./gameRegistry";
import { SecretHitlerHistorian } from "../games/secret-hitler/historian";
import { CitiesHistorian } from "../games/cities/historian";
import { LongShotHistorian } from "../games/long-shot/historian";

export function registerAllGameHistorians() {
  registerGameHistorian(SecretHitlerHistorian);
  registerGameHistorian(CitiesHistorian);
  registerGameHistorian(LongShotHistorian);
}

// Auto-register on import (for convenience)
registerAllGameHistorians();
