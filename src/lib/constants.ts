export type Cuisine = { id: string; label: string; query: string; hue: number };

export const CUISINES: Cuisine[] = [
  { id: "indian", label: "Indian", query: "Indian", hue: 22 },
  { id: "mexican", label: "Mexican", query: "Mexican", hue: 350 },
  { id: "italian", label: "Italian", query: "Italian", hue: 138 },
  { id: "chinese", label: "Chinese", query: "Chinese", hue: 2 },
  { id: "thai", label: "Thai", query: "Thai", hue: 88 },
  { id: "japanese", label: "Japanese", query: "Japanese", hue: 205 },
  { id: "turkish", label: "Turkish", query: "Turkish", hue: 14 },
  { id: "greek", label: "Greek", query: "Greek", hue: 198 },
  { id: "lebanese", label: "Lebanese", query: "Lebanese", hue: 118 },
  { id: "caribbean", label: "Caribbean", query: "Caribbean", hue: 42 },
  { id: "vietnamese", label: "Vietnamese", query: "Vietnamese", hue: 162 },
  { id: "korean", label: "Korean", query: "Korean", hue: 328 },
  { id: "burgers", label: "Burgers", query: "burger", hue: 28 },
  { id: "pizza", label: "Pizza", query: "pizza", hue: 6 },
  { id: "british", label: "Pub & British", query: "British pub food", hue: 258 },
  { id: "spanish", label: "Spanish", query: "Spanish tapas", hue: 36 },
  { id: "vegan", label: "Vegan", query: "vegan", hue: 148 },
];
export const CUISINE_BY_ID = Object.fromEntries(CUISINES.map((c) => [c.id, c]));

export const DIETS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "halal", label: "Halal" },
  { id: "gluten_free", label: "Gluten-free" },
] as const;
export const DIET_LABEL: Record<string, string> = Object.fromEntries(DIETS.map((d) => [d.id, d.label]));

export const PRICES = [
  { id: 1, label: "£" },
  { id: 2, label: "££" },
  { id: 3, label: "£££" },
  { id: 4, label: "££££" },
];
export const DISTANCES = [
  { id: 1, label: "1 mile" },
  { id: 2, label: "2 miles" },
  { id: 5, label: "5 miles" },
];
export const MINUTES = [
  { id: 2, label: "2 min" },
  { id: 3, label: "3 min" },
  { id: 5, label: "5 min" },
];

/** How many places go into a group's swipe deck. */
export const DECK_SIZE = 12;

/** Where the web version lives once deployed, for share links (SETUP.md, step 8). */
export const SHARE_URL = (process.env.EXPO_PUBLIC_SHARE_URL || "").replace(/\/$/, "");

export const priceLabel = (n: number | null) => (n ? "£".repeat(n) : "Price not listed");

/** A stable colour for places without a photo. */
export function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}
