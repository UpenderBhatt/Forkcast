import { ensureSignedIn, isConfigured, NOT_SET_UP, supabase } from "./supabase";

export type Hygiene = { value: string; scheme: string };

/** One place in a list or swipe deck. Matches the shape the "places" function returns. */
export type PlaceSummary = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMi: number;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  type: string;
  photo: string | null;
  openNow: boolean | null;
  vegetarian: boolean | null;
  website: string | null;
  mapsUrl: string | null;
  chain: boolean;
  hygiene: Hygiene | null;
};

export type Review = { author: string; authorUrl: string | null; rating: number | null; when: string; text: string };

export type PlaceDetails = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  type: string;
  summary: string | null;
  photos: { name: string; credit: string | null }[];
  openNow: boolean | null;
  hours: string[];
  website: string | null;
  phone: string | null;
  mapsUrl: string | null;
  vegetarian: boolean | null;
  vegan: boolean | null;
  takeout: boolean | null;
  delivery: boolean | null;
  reservable: boolean | null;
  reviews: Review[];
};

export type SearchParams = {
  lat: number;
  lng: number;
  miles: number;
  cuisines: string[]; // search words, e.g. "Indian"
  budgets: number[];
  diets: string[];
  hideChains: boolean;
  openNow: boolean;
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  if (!isConfigured) throw new Error(NOT_SET_UP);
  await ensureSignedIn();
  const { data, error } = await supabase.functions.invoke("places", { body });
  if (error) {
    // The function sends a readable { error } message; dig it out if it's there.
    let message = error.message;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const j = await ctx.clone().json();
        if (j?.error) message = j.error;
      } catch {
        /* keep the generic message */
      }
    }
    if (/Failed to send|fetch/i.test(message)) message = "Couldn't reach the server. Check your connection, and that the places function is deployed (SETUP.md, step 4).";
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in data) throw new Error(String((data as { error: unknown }).error));
  return data as T;
}

export const searchPlaces = (p: SearchParams) =>
  call<{ places: PlaceSummary[]; hiddenChains: number }>({ action: "search", ...p });

export const placeDetails = (id: string) => call<PlaceDetails>({ action: "details", id });

export const geocode = (text: string) => call<{ lat: number; lng: number; label: string }>({ action: "geocode", text });

// Photo links are fetched once per photo while the app is open.
const photoCache = new Map<string, Promise<string>>();
export function photoUri(name: string, width = 800): Promise<string> {
  const key = `${name}@${width}`;
  let p = photoCache.get(key);
  if (!p) {
    p = call<{ uri: string }>({ action: "photo", name, width }).then((r) => r.uri);
    p.catch(() => photoCache.delete(key));
    photoCache.set(key, p);
  }
  return p;
}
