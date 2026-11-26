export type GoogleType = "cafe" | "cafe-ish" | "not-cafe";

const CAFE_TYPES = new Set([
  "cafe",
  "coffee_shop",
  "tea_house",
  "cat_cafe",
  "dog_cafe",
]);

const CAFE_ISH_TYPES = new Set([
  "bakery",
  "restaurant",
  "food",
  "cafeteria",
  "meal_takeaway",
  "dessert_shop",
  "bagel_shop",
  "donut_shop",
  "juice_shop",
  "food_court",
]);

const VAGUE_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "premise",
  "subpremise",
  "street_address",
  "route",
  "geocode",
  "plus_code",
]);

const isCafeIsh = (type: string) =>
  CAFE_ISH_TYPES.has(type) || type.endsWith("_restaurant");

export function googleTypeOf(types: string[]): GoogleType | undefined {
  if (types.some((t) => CAFE_TYPES.has(t))) return "cafe";
  if (types.some(isCafeIsh)) return "cafe-ish";
  if (types.some((t) => !VAGUE_TYPES.has(t))) return "not-cafe";
  return undefined;
}
