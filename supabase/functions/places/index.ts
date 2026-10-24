// Forkcast "places" function.
// Runs on Supabase so the Google API key never ships inside the app.
// Actions: search, details, photo, geocode.

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_KEY") ?? "";
const PLACES = "https://places.googleapis.com/v1";
const FSA = "https://api.ratings.food.gov.uk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Big UK chains to hide. Add to this list as you spot more.
const CHAINS = [
  "mcdonalds", "kfc", "nandos", "burger king", "five guys", "subway", "greggs", "dominos",
  "pizza hut", "papa johns", "pizza express", "wagamama", "zizzi", "prezzo", "ask italian",
  "bella italia", "frankie and bennys", "toby carvery", "harvester", "wetherspoon",
  "jd wetherspoon", "starbucks", "costa", "caffe nero", "pret", "pret a manger", "leon",
  "itsu", "yo sushi", "wasabi", "tortilla", "chiquito", "tgi fridays", "taco bell",
  "wimpy", "popeyes", "wingstop", "german doner kebab", "miller and carter", "beefeater",
  "brewers fayre", "slug and lettuce", "all bar one", "las iguanas", "turtle bay",
  "cote", "cafe rouge", "gourmet burger kitchen", "byron", "honest burgers", "giraffe",
  "chopstix", "tasty pizza", "dixy chicken", "chicken cottage", "morleys",
  "krispy kreme", "tim hortons", "chipotle", "nandos chicken", "pizzaexpress",
];

type PlaceSummary = {
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
  hygiene: { value: string; scheme: string } | null;
};

const PRICE_IN: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const SEARCH_FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.shortFormattedAddress",
  "places.location", "places.rating", "places.userRatingCount", "places.priceLevel",
  "places.primaryTypeDisplayName", "places.photos", "places.currentOpeningHours.openNow",
  "places.servesVegetarianFood", "places.websiteUri", "places.googleMapsUri", "places.businessStatus",
  "nextPageToken",
].join(",");

const DETAIL_FIELDS = [
  "id", "displayName", "formattedAddress", "location", "rating", "userRatingCount", "priceLevel",
  "primaryTypeDisplayName", "photos", "currentOpeningHours.openNow", "regularOpeningHours.weekdayDescriptions",
  "websiteUri", "nationalPhoneNumber", "googleMapsUri", "reviews", "editorialSummary",
  "servesVegetarianFood", "servesVeganFood", "takeout", "delivery", "dineIn", "reservable",
].join(",");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

export function normalise(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`.]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|restaurant|ltd|limited|uk)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isChain(name: string): boolean {
  const n = normalise(name);
  return CHAINS.some((c) => n === c || n.startsWith(c + " "));
}

export function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function google(path: string, fields: string, body?: unknown) {
  const res = await fetch(`${PLACES}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": fields },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `Google returned ${res.status}`;
    throw new Error(`Google Places: ${msg}`);
  }
  return data;
}

// ---------- hygiene (Food Standards Agency, free, no key) ----------
type Fsa = { value: string; scheme: string } | null;

async function hygieneFor(name: string, lat: number, lng: number, signal: AbortSignal): Promise<Fsa> {
  const q = new URLSearchParams({
    name, latitude: String(lat), longitude: String(lng), maxDistanceLimit: "0.3", pageSize: "10",
  });
  const res = await fetch(`${FSA}/Establishments?${q}`, {
    headers: { "x-api-version": "2", accept: "application/json" }, signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const want = normalise(name);
  let best: { value: string; scheme: string; d: number } | null = null;
  for (const e of data?.establishments ?? []) {
    const got = normalise(String(e.BusinessName ?? ""));
    if (!got || !(got === want || got.includes(want) || want.includes(got))) continue;
    const eLat = Number(e.geocode?.latitude), eLng = Number(e.geocode?.longitude);
    const d = Number.isFinite(eLat) && Number.isFinite(eLng) ? milesBetween(lat, lng, eLat, eLng) : 0.2;
    if (d > 0.2) continue;
    if (!best || d < best.d) best = { value: String(e.RatingValue ?? ""), scheme: String(e.SchemeType ?? "FHRS"), d };
  }
  return best ? { value: best.value, scheme: best.scheme } : null;
}

async function addHygiene(places: PlaceSummary[]) {
  // Best effort: give the FSA 4 seconds, 8 lookups at a time.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  let i = 0;
  const worker = async () => {
    while (i < places.length) {
      const p = places[i++];
      try { p.hygiene = await hygieneFor(p.name, p.lat, p.lng, ctrl.signal); } catch { p.hygiene = null; }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  clearTimeout(timer);
}

// ---------- actions ----------
const DIET_WORDS: Record<string, string> = { vegan: "vegan", halal: "halal", gluten_free: "gluten free" };

async function search(b: any) {
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("A valid location is needed.");
  }
  const miles = Math.min(10, Math.max(0.5, Number(b.miles) || 2));
  const radius = Math.min(50000, miles * 1609.34);
  const cuisines: string[] = (Array.isArray(b.cuisines) ? b.cuisines : []).map(String).slice(0, 4);
  const diets: string[] = (Array.isArray(b.diets) ? b.diets : []).map(String);
  const budgets: number[] = (Array.isArray(b.budgets) ? b.budgets : []).map(Number).filter((n: number) => n >= 1 && n <= 4);
  const dietWords = diets.map((d) => DIET_WORDS[d]).filter(Boolean).join(" ");

  const queries = cuisines.length
    ? cuisines.map((c) => `${dietWords} ${c} restaurant`.trim())
    : [`${dietWords} restaurants`.trim()];

  const raw = new Map<string, any>();
  await Promise.all(queries.map(async (textQuery) => {
    let pageToken: string | undefined;
    const pages = cuisines.length > 1 ? 1 : 2;
    for (let page = 0; page < pages; page++) {
      const body: Record<string, unknown> = {
        textQuery, pageSize: 20, regionCode: "GB", languageCode: "en-GB",
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      };
      if (b.openNow) body.openNow = true;
      if (pageToken) body.pageToken = pageToken;
      const data = await google("places:searchText", SEARCH_FIELDS, body);
      for (const p of data.places ?? []) if (!raw.has(p.id)) raw.set(p.id, p);
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }));

  let hiddenChains = 0;
  const out: PlaceSummary[] = [];
  for (const p of raw.values()) {
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
    const pLat = p.location?.latitude, pLng = p.location?.longitude;
    if (typeof pLat !== "number" || typeof pLng !== "number") continue;
    const distanceMi = milesBetween(lat, lng, pLat, pLng);
    if (distanceMi > miles) continue;
    const name = p.displayName?.text ?? "Unnamed";
    const chain = isChain(name);
    const priceLevel = p.priceLevel ? PRICE_IN[p.priceLevel] ?? null : null;
    // Places with no listed price stay in: many independents never set one.
    if (budgets.length && priceLevel !== null && !budgets.includes(priceLevel)) continue;
    if (diets.includes("vegetarian") && p.servesVegetarianFood === false) continue;
    if (chain && b.hideChains !== false) { hiddenChains++; continue; }
    out.push({
      id: p.id, name,
      address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
      lat: pLat, lng: pLng, distanceMi: Math.round(distanceMi * 10) / 10,
      rating: typeof p.rating === "number" ? p.rating : null,
      ratingCount: p.userRatingCount ?? 0,
      priceLevel,
      type: p.primaryTypeDisplayName?.text ?? "Restaurant",
      photo: p.photos?.[0]?.name ?? null,
      openNow: typeof p.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : null,
      vegetarian: typeof p.servesVegetarianFood === "boolean" ? p.servesVegetarianFood : null,
      website: p.websiteUri ?? null,
      mapsUrl: p.googleMapsUri ?? null,
      chain, hygiene: null,
    });
  }
  out.sort((a, c) => score(c) - score(a));
  const places = out.slice(0, 40);
  await addHygiene(places);
  return { places, hiddenChains };
}

function score(p: PlaceSummary) {
  // Rating counts most; a few reviews count for less than many; closer is better.
  const r = p.rating ?? 3.8;
  const confidence = Math.min(1, Math.log10(1 + p.ratingCount) / 2.5);
  return r * (0.6 + 0.4 * confidence) - p.distanceMi * 0.08;
}

async function details(b: any) {
  const id = String(b.id ?? "");
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error("Unknown place.");
  const p = await google(`places/${id}?languageCode=en-GB&regionCode=GB`, DETAIL_FIELDS);
  return {
    id: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
    priceLevel: p.priceLevel ? PRICE_IN[p.priceLevel] ?? null : null,
    type: p.primaryTypeDisplayName?.text ?? "Restaurant",
    summary: p.editorialSummary?.text ?? null,
    photos: (p.photos ?? []).slice(0, 6).map((ph: any) => ({
      name: ph.name,
      credit: ph.authorAttributions?.[0]?.displayName ?? null,
    })),
    openNow: p.currentOpeningHours?.openNow ?? null,
    hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    vegetarian: p.servesVegetarianFood ?? null,
    vegan: p.servesVeganFood ?? null,
    takeout: p.takeout ?? null,
    delivery: p.delivery ?? null,
    reservable: p.reservable ?? null,
    reviews: (p.reviews ?? []).slice(0, 5).map((r: any) => ({
      author: r.authorAttribution?.displayName ?? "Google user",
      authorUrl: r.authorAttribution?.uri ?? null,
      rating: r.rating ?? null,
      when: r.relativePublishTimeDescription ?? "",
      text: r.text?.text ?? r.originalText?.text ?? "",
    })),
  };
}

async function photo(b: any) {
  const name = String(b.name ?? "");
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) throw new Error("Unknown photo.");
  const width = Math.min(1600, Math.max(200, Number(b.width) || 800));
  const res = await fetch(`${PLACES}/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`, {
    headers: { "X-Goog-Api-Key": GOOGLE_KEY },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.photoUri) throw new Error("Photo not available.");
  return { uri: data.photoUri };
}

async function geocode(b: any) {
  const text = String(b.text ?? "").trim().slice(0, 80);
  if (!text) throw new Error("Type a town, city or postcode.");
  const data = await google("places:searchText", "places.location,places.formattedAddress,places.displayName", {
    textQuery: text, pageSize: 1, regionCode: "GB", languageCode: "en-GB",
  });
  const p = data.places?.[0];
  if (!p?.location) throw new Error(`Couldn't find "${text}". Try a postcode or a nearby town.`);
  return { lat: p.location.latitude, lng: p.location.longitude, label: p.displayName?.text ?? text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!GOOGLE_KEY) return json({ error: "The GOOGLE_PLACES_KEY secret isn't set on Supabase yet. See SETUP.md, step 4." }, 500);
  try {
    const b = await req.json();
    switch (b?.action) {
      case "search": return json(await search(b));
      case "details": return json(await details(b));
      case "photo": return json(await photo(b));
      case "geocode": return json(await geocode(b));
      default: return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
