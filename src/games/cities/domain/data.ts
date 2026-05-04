import type { ScoringCard } from "./types";

export const CITIES = [
  "Sydney",
  "Venice",
  "New York",
  "Barcelona",
  "Rio",
  "Lisbon",
  "Mexico City",
  "Buenos Aires"
] as const;

const SCORING_CARD_NAMES_AND_DESCRIPTIONS = [
  { name: "Factories", description: "2 VP per blue exactly 2 high" },
  { name: "Liveable City", description: "2 VP per set of red, green, blue, yellow of any size" },
  { name: "House", description: "1 VP per yellow exactly 1 building high" },
  { name: "Hotels", description: "4 VP per yellow exactly 3 building high" },
  { name: "Restaurants", description: "1 VP per red exactly 1 building high" },
  { name: "Schools", description: "Rule text to be finalized" },
  { name: "Parkland", description: "Rule text to be finalized" },
  { name: "Corporate Tower", description: "Rule text to be finalized" },
  { name: "Museum", description: "Rule text to be finalized" },
  { name: "Localbusiness", description: "Rule text to be finalized" },
  { name: "Bay", description: "Rule text to be finalized" },
  { name: "Historic Building", description: "Rule text to be finalized" },
  { name: "Famous Building", description: "Rule text to be finalized" },
  { name: "Parks", description: "Rule text to be finalized" },
  { name: "Lakes", description: "Rule text to be finalized" },
  { name: "Aparmtent Building", description: "Rule text to be finalized" },
  { name: "Residential Tower", description: "Rule text to be finalized" },
  { name: "Governemnt Towers", description: "Rule text to be finalized" },
  { name: "Malls", description: "Rule text to be finalized" },
  { name: "Deaprtment Stores", description: "Rule text to be finalized" },
  { name: "Art Galleries", description: "Rule text to be finalized" },
  { name: "Office Buildings", description: "Rule text to be finalized" }
] as const;

export const SCORING_CARD_LIBRARY: ScoringCard[] = SCORING_CARD_NAMES_AND_DESCRIPTIONS.map((card, index) => ({
  id: `Card ${index + 1}`,
  name: card.name,
  description: card.description
}));

export const CITY_OPTIONS = CITIES.map((city) => ({
  id: city,
  label: city,
  skyline: city.slice(0, 2).toUpperCase()
}));