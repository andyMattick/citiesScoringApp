import type { ScoringCard } from "./types";

export interface CityAchievementSection {
  label: string;
  points: readonly number[];
}

export interface CityOption {
  id: string;
  label: string;
  skyline: string;
  achievementSections: readonly CityAchievementSection[];
}

export const CITY_OPTIONS: readonly CityOption[] = [
  {
    id: "Lisbon",
    label: "Lisbon",
    skyline: "LI",
    achievementSections: [
      { label: "Cultural Centre", points: [5, 3, 1] },
      { label: "Beautiful Parks", points: [6, 4, 2] },
      { label: "Neighbourhoods", points: [7, 5, 3] }
    ]
  },
  {
    id: "Venice",
    label: "Venice",
    skyline: "VE",
    achievementSections: [
      { label: "Waterside Buildings", points: [5, 3, 1] },
      { label: "Grand Canal", points: [6, 4, 2] },
      { label: "Bridges", points: [7, 5, 3] }
    ]
  },
  {
    id: "Sydney",
    label: "Sydney",
    skyline: "SY",
    achievementSections: [
      { label: "Botanic Gardens", points: [5, 3, 1] },
      { label: "Harbour City", points: [6, 4, 2] },
      { label: "Circular Quay", points: [7, 5, 3] }
    ]
  },
  {
    id: "Buenos Aires",
    label: "Buenos Aires",
    skyline: "BA",
    achievementSections: [
      { label: "Avenida 9 De Julio", points: [5, 3, 1] },
      { label: "Lago de Regatas", points: [6, 4, 2] },
      { label: "Plaza de Mayo", points: [7, 5, 3] }
    ]
  },
  {
    id: "Mexico City",
    label: "Mexico City",
    skyline: "MC",
    achievementSections: [
      { label: "Maintenance of Xochimilco", points: [5, 3, 1] },
      { label: "Chapultepec", points: [6, 4, 2] },
      { label: "Historic Downtown", points: [7, 5, 3] }
    ]
  },
  {
    id: "Rio de Janeiro",
    label: "Rio de Janeiro",
    skyline: "RJ",
    achievementSections: [
      { label: "Guanabara Bay", points: [5, 3, 1] },
      { label: "Centro", points: [6, 4, 2] },
      { label: "Beachside Living", points: [7, 5, 3] }
    ]
  },
  {
    id: "New York City",
    label: "New York City",
    skyline: "NY",
    achievementSections: [
      { label: "Central Park", points: [5, 3, 1] },
      { label: "Avenues", points: [6, 4, 2] },
      { label: "Skyscrapers", points: [7, 5, 3] }
    ]
  },
  {
    id: "Barcelona",
    label: "Barcelona",
    skyline: "BC",
    achievementSections: [
      { label: "Eixample", points: [5, 3, 1] },
      { label: "Barceloneta Beach", points: [6, 4, 2] },
      { label: "Ciutadella Park", points: [7, 5, 3] }
    ]
  }
] as const;

export const CITIES = CITY_OPTIONS.map((city) => city.id);

const SCORING_CARD_NAMES_AND_DESCRIPTIONS = [
  { name: "Factories", vpValue: 2, perUnit: "blue buildings exactly 2 high" },
  { name: "Liveable City", vpValue: 2, perUnit: "sets of red, green, blue, yellow of any size" },
  { name: "House", vpValue: 1, perUnit: "yellow buildings exactly 1 high" },
  { name: "Hotels", vpValue: 4, perUnit: "yellow buildings exactly 3 high" },
  { name: "Restaurants", vpValue: 1, perUnit: "red buildings exactly 1 high" },
  { name: "Schools", vpValue: 1, perUnit: "green buildings exactly 1 high" },
  { name: "Retail Towers", vpValue: 6, perUnit: "red buildings exactly 4 high" },
  { name: "Parkland", vpValue: "1/2", perUnit: "park spaces in your largest park" },
  { name: "Corporate Tower", vpValue: 6, perUnit: "blue buildings exactly 4 high" },
  { name: "Museum", vpValue: 1, perUnit: "buildings of any colour exactly 2 high" },
  { name: "Local Business", vpValue: 1, perUnit: "blue buildings exactly 1 high" },
  { name: "Bay", vpValue: "1/2", perUnit: "water spaces in your largest water" },
  { name: "Historic Building", vpValue: 1, perUnit: "buildings of any colour exactly 2 high" },
  { name: "Famous Building", vpValue: 2, perUnit: "buildings of any colour exactly 3 high" },
  { name: "Parks", vpValue: 1, perUnit: "separate park areas" },
  { name: "Lakes", vpValue: 1, perUnit: "separate water areas" },
  { name: "Apartment Building", vpValue: 2, perUnit: "yellow buildings exactly 2 high" },
  { name: "Residential Tower", vpValue: 6, perUnit: "yellow buildings exactly 4 high" },
  { name: "Government Towers", vpValue: 6, perUnit: "green buildings exactly 4 high" },
  { name: "Malls", vpValue: 4, perUnit: "red buildings exactly 3 high" },
  { name: "Department Stores", vpValue: 2, perUnit: "red buildings exactly 2 high" },
  { name: "Art Galleries", vpValue: 4, perUnit: "green buildings exactly 3 high" },
  { name: "Office Buildings", vpValue: 4, perUnit: "blue buildings exactly 3 high" }
] as const;

export const SCORING_CARD_LIBRARY: ScoringCard[] = SCORING_CARD_NAMES_AND_DESCRIPTIONS.map((card, index) => ({
  id: `Card ${index + 1}`,
  name: card.name,
  vpValue: card.vpValue,
  perUnit: card.perUnit
}));
