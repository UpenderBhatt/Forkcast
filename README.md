# Forkcast

**Decide where to eat, by yourself or as a group, with local independent restaurants shown first.**

Pick a location, a budget and the kind of food you fancy, and Forkcast suggests nearby places. Big chains are hidden by default. On your own, you browse photos, reviews, hygiene ratings and menus. With friends, everyone swipes on the same shortlist, each person can veto one place, and the app picks the winner. Ties are settled by a spin of the wheel.

Built with Expo and React Native, so one codebase runs on **iPhone, Android and the web**.

---

## Features

### Finding places
- **Search by:**
  - location (typed, or your current location)
  - budget (£ to ££££)
  - up to 4 cuisines
  - distance (1, 2 or 5 miles)
  - dietary needs (vegetarian, vegan, halal, gluten-free)
  - "open now"
- **Chains hidden by default:** McDonald's, KFC, Nando's, Wagamama and around 60 other UK chains, with a toggle to show them.
- **Real data:**
  - Google photos, ratings, reviews, opening hours, phone numbers and website or menu links
  - Food Standards Agency hygiene ratings, including Scotland's Pass / Improvement Required scheme
- **Sort** by best match or by closest.
- **Surprise me** spins a wheel between your top results.
- **Place page** with a photo carousel, reviews, opening hours, directions, a call button and a menu link.

### Deciding as a group
- **Everyone on their own phone:**
  - The host creates a group and shares a link or a 4-letter code.
  - Friends join as guests. No account is needed, and the web version works without installing anything.
  - Each person adds their dietary needs, and the shortlist only includes places that suit everyone.
- **Swipe voting:** swipe right for yes and left for no, against a 2, 3 or 5 minute timer.
- **One veto each:** it removes a place for the whole group, no questions asked.
- **Results:** the most yes votes wins. A tie triggers the spin-the-wheel, which lands on the same place on every phone. Everyone sees a breakdown of how the votes went.
- **Pass one phone around:** for a group sitting together. Everyone takes a private turn on one device.

---

## Tech stack

| Part | What it uses |
|---|---|
| App | [Expo](https://expo.dev) SDK 57, React Native, TypeScript, [Expo Router](https://docs.expo.dev/router/introduction/) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Backend | [Supabase](https://supabase.com): Postgres, row-level security, anonymous sign-in, Realtime, Edge Functions |
| Restaurant data | [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview) |
| Hygiene ratings | [Food Standards Agency ratings API](https://api.ratings.food.gov.uk/help) (free, no key) |
| Graphics | react-native-svg for the tie-break wheel |

### How it fits together

```
 Phone / browser (Expo app)
   │
   ├── supabase-js ──► Postgres: groups + members tables (row-level security)
   │                   Realtime pushes votes to everyone's screen live
   │
   └── Edge Function "places" ──► Google Places API (search, details, photos)
                              └─► Food Standards Agency API (hygiene ratings)
```

The Google API key lives only on Supabase, as a secret used by the `places` function. It is never shipped inside the app, so nobody can pull it out and run up the bill. The function also does the work that would be awkward on a phone:
- filtering out chains
- dropping places that are closed or too far away
- matching each place to its hygiene rating

---

## Getting started

### Requirements
- [Node.js](https://nodejs.org) (LTS)
- The **Expo Go** app on your phone (App Store or Google Play)
- A free [Supabase](https://supabase.com) account
- A [Google Cloud](https://console.cloud.google.com) project with **Places API (New)** enabled. Billing must be on, but there's a free monthly allowance.

### Quick start

```sh
git clone https://github.com/UpenderBhatt/forkcast.git
cd forkcast
npm install
cp .env.example .env    # Windows: copy .env.example .env
```

Then do the one-off setup:

1. **Supabase:** create a project and turn on **anonymous sign-ins** (Authentication → Sign In / Providers).
2. **Database:** run [`supabase/migrations/20261010000000_groups.sql`](supabase/migrations/20261010000000_groups.sql) in the Supabase SQL Editor.
3. **Google key:** create an API key restricted to Places API (New), and add it in Supabase as the Edge Function secret `GOOGLE_PLACES_KEY`.
4. **Places function:** deploy [`supabase/functions/places/index.ts`](supabase/functions/places/index.ts) as an Edge Function named `places`.
5. **Connect the app:** put your Supabase project URL and publishable (anon) key in `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
   ```
6. **Run it:**
   ```sh
   npx expo start
   ```
   Scan the QR code with your phone. On iPhone use the Camera app; on Android use Expo Go. Press `w` to open the web version.

**👉 [SETUP.md](SETUP.md) walks through every step in detail**, including deploying from the Supabase dashboard with no extra tools, putting the web version online for share links, troubleshooting and costs.

### Useful commands

```sh
npx expo start             # run the app (add --tunnel if your phone can't connect)
npx tsc --noEmit           # type-check
npx expo export -p web     # build the web version into dist/
```

### Environment variables

| Variable | Needed | What it's for |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | Yes | Supabase publishable (anon) key. It's meant to be public; row-level security protects the data. |
| `EXPO_PUBLIC_SHARE_URL` | Optional | Where the web version is hosted, so share links look like `https://…/j/ABCD` |
| `GOOGLE_PLACES_KEY` | Yes, as a **Supabase secret** | Never put this in `.env` or the app |

---

## Project structure

```
src/
  app/                    Screens (Expo Router: every file is a route)
    index.tsx             Home
    search.tsx            Location, budget, cuisine, distance, diet, chain toggle
    results.tsx           Results list, sorting, Surprise me
    surprise.tsx          Spin-the-wheel between top results
    place/[id].tsx        Photos, reviews, hours, menu link, directions, call
    group/index.tsx       Choose online group or pass-the-phone
    group/names.tsx       Pass-the-phone: add people
    group/local.tsx       Pass-the-phone: turns, swiping, result
    group/[code].tsx      Online group: lobby, swiping, waiting, result
    join.tsx              Join with a code
    j/[code].tsx          Short share link → join screen
  components/
    SwipeSession.tsx      Swipe deck with drag gestures, timer and veto
    Outcome.tsx           Winner screen, vote breakdown, tie-break wheel
    place.tsx             Place cards, photos, badges, ratings
    ui.tsx                Buttons, chips, toggles and layout pieces
  lib/
    supabase.ts           Supabase client and guest sign-in
    api.ts                Calls to the places function
    groups.ts             Create, join and vote, with live group updates
    results.ts            Vote counting, vetoes and tie-breaks
    store.ts              App state and search
    constants.ts          Cuisines, diets, prices, distances
    theme.ts              Light and dark colours
supabase/
  functions/places/       Edge Function: Google Places + Food Standards Agency
  migrations/             Group tables, access rules, realtime
```

---

## Roadmap

- [ ] App icon, splash screen and store builds with EAS
- [ ] Meet in the middle: suggest places that are fair on everyone's travel time
- [ ] Favourites and "been there" history
- [ ] Booking links
- [ ] Promoted listings for local restaurants, always labelled and never affecting votes
- [ ] Automatic clean-up of old groups

## Data and attribution

Restaurant details, photos, ratings and reviews come from Google Maps Platform and are shown with attribution, in line with Google's terms. Hygiene ratings come from the Food Standards Agency and are used under the Open Government Licence.
