import type { Category } from "../scoring/scorer";

/** Short sheet labels for every category, in sheet order. */
export const CATEGORY_LABELS: Record<Category, string> = {
  ones: "Ones",
  twos: "Twos",
  threes: "Threes",
  fours: "Fours",
  fives: "Fives",
  sixes: "Sixes",
  threeKind: "3 of a kind",
  fourKind: "4 of a kind",
  fullHouse: "Full house",
  smallStraight: "Sm. straight",
  largeStraight: "Lg. straight",
  yatzy: "Yatzy",
  chance: "Chance",
};
