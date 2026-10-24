import { create } from "zustand";
import { geocode, searchPlaces, type PlaceSummary } from "./api";
import { CUISINE_BY_ID, DECK_SIZE } from "./constants";

export type Settings = {
  locationText: string;
  coords: { lat: number; lng: number } | null;
  locationLabel: string; // what we show, e.g. "your location" or "Canton, Cardiff"
  budgets: number[];
  cuisines: string[];
  diets: string[];
  miles: number;
  hideChains: boolean;
  openNow: boolean;
  minutes: number;
};

export type Player = { name: string; swipes: string; veto: string | null };

type State = {
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  /** Every place seen this session, so detail and outcome screens can show summaries. */
  known: Record<string, PlaceSummary>;
  remember: (places: PlaceSummary[]) => void;
  players: Player[];
  setPlayers: (p: Player[]) => void;
  localDeck: PlaceSummary[];
  setLocalDeck: (d: PlaceSummary[]) => void;
};

export const useApp = create<State>((set) => ({
  settings: {
    locationText: "",
    coords: null,
    locationLabel: "",
    budgets: [],
    cuisines: [],
    diets: [],
    miles: 2,
    hideChains: true,
    openNow: false,
    minutes: 3,
  },
  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
  known: {},
  remember: (places) =>
    set((st) => ({ known: { ...st.known, ...Object.fromEntries(places.map((p) => [p.id, p])) } })),
  players: [],
  setPlayers: (players) => set({ players }),
  localDeck: [],
  setLocalDeck: (localDeck) => set({ localDeck }),
}));

/** Settings saved on a group so the host can run the search. */
export type GroupSettings = Omit<Settings, "locationText" | "minutes"> & { minutes: number };

/** Turns typed text into coordinates if needed, then searches. */
export async function runSearch(s: Settings | GroupSettings, extraDiets: string[] = []) {
  let coords = s.coords;
  let label = s.locationLabel;
  if (!coords) {
    const text = "locationText" in s ? s.locationText.trim() : "";
    if (!text) throw new Error("Add a location, or tap “Use my location”.");
    const g = await geocode(text);
    coords = { lat: g.lat, lng: g.lng };
    label = g.label;
    useApp.getState().setSettings({ coords, locationLabel: label });
  }
  const res = await searchPlaces({
    lat: coords.lat,
    lng: coords.lng,
    miles: s.miles,
    cuisines: s.cuisines.map((id) => CUISINE_BY_ID[id]?.query ?? id),
    budgets: s.budgets,
    diets: [...new Set([...s.diets, ...extraDiets])],
    hideChains: s.hideChains,
    openNow: s.openNow,
  });
  useApp.getState().remember(res.places);
  return { ...res, coords, label };
}

export const buildDeck = (places: PlaceSummary[]) => places.slice(0, DECK_SIZE);
