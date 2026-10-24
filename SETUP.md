# Setting up Forkcast

This gets the app running on your phone with real restaurants. Allow about 45 minutes the first time. You only do steps 1 to 5 once.

You'll set up three things:

- **Supabase** (free). It holds the group voting data, signs people in as guests with no account needed, and hides your Google key.
- **Google Places API**. Real restaurants, photos, ratings and reviews. Google gives a free monthly allowance, then charges per request.
- **The app itself**, running on your phone through the free **Expo Go** app.

Hygiene ratings come from the Food Standards Agency. That's free and needs no setup.

---

## 1. Install the tools

1. Install **Node.js** (the "LTS" version) from <https://nodejs.org>.
2. On your phone, install **Expo Go** from the App Store or Google Play.
3. Download the project and install its packages:

   ```sh
   git clone https://github.com/UpenderBhatt/forkcast.git
   cd forkcast
   npm install
   ```

   On Windows, you can open a terminal in a folder by clicking File Explorer's address bar, typing `powershell` and pressing Enter.

## 2. Create the Supabase project

1. Sign up at <https://supabase.com> and create a **New project**. Pick the London region (eu-west-2) if it's offered. Save the database password somewhere safe.
2. In the left menu, go to **Authentication → Sign In / Providers**. Turn on **Allow anonymous sign-ins** and save.
   This lets friends join a group without making an account.

## 3. Create the group tables

1. In the left menu, open **SQL Editor** and start a new query.
2. Open `supabase/migrations/20261010000000_groups.sql` from this project. Copy all of it, paste it in, and press **Run**.
3. You should see "Success. No rows returned".

## 4. Get a Google key and deploy the places function

**Get the key**

1. Go to <https://console.cloud.google.com> and create a project (e.g. "Forkcast").
2. Set up **Billing** for it. Google asks for a card even though there's a free monthly allowance.
3. Go to **Billing → Budgets & alerts** and create a small budget, e.g. £10, with email alerts. Do this now, so a bug can never surprise you with a bill.
4. Go to **APIs & Services → Library**, search for **Places API (New)** and press **Enable**.
5. Go to **APIs & Services → Credentials → Create credentials → API key**.
6. Edit the new key. Under **API restrictions**, choose **Restrict key**, tick **Places API (New)**, and save.

**Deploy the function** (dashboard route, no extra tools)

1. In Supabase, open **Edge Functions → Secrets**. Add a secret named `GOOGLE_PLACES_KEY` with your Google key as the value.
2. Open **Edge Functions** and choose to deploy a new function **via the editor**.
3. Name it exactly `places`. Replace the example code with everything in `supabase/functions/places/index.ts`, then deploy.

<details>
<summary>Prefer the command line?</summary>

```sh
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase secrets set GOOGLE_PLACES_KEY=your-google-key
npx supabase functions deploy places
```

Your project ref is the part before `.supabase.co` in your project URL.
</details>

Your Google key now lives only on Supabase. It is never inside the app, so nobody can pull it out of the app and run up your bill.

## 5. Connect the app to Supabase

1. In Supabase, open **Project Settings → API Keys** (or press **Connect** at the top of the dashboard).
2. Copy `.env.example` to a new file called `.env` in the project folder.
3. Fill in your project URL and your **publishable** key (the older dashboards call it the **anon** key):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
   ```

   This key is meant to be public. Your data is protected by the rules you ran in step 3. **Never** put the `service_role` or secret key in here.

## 6. Run it on your phone

```sh
npx expo start
```

- **iPhone:** scan the QR code with the Camera app.
- **Android:** scan it from inside Expo Go.

Your phone and computer need to be on the same Wi-Fi. If the QR code won't connect, run `npx expo start --tunnel` instead.

Press `w` in the terminal to open the web version in your browser too.

## 7. Test the group voting

You need two "people":

- two phones, or
- your phone plus the web version on your computer (press `w`).

Then:

1. On the first one, choose **With friends → Everyone on their own phone**. Fill in the search and tap **Create group**.
2. On the other, tap **Got a group code? Join a group** and type the 4-letter code.
3. Start swiping. When everyone's done or the timer runs out, every screen shows the same winner. A tie spins the wheel.

**Pass one phone around** works on a single phone and needs no second device.

## 8. Put the web version online (for share links)

Friends without the app join through the web version. To put it online:

1. Build it:

   ```sh
   npx expo export --platform web
   ```

2. Go to <https://app.netlify.com/drop> and drag the new `dist` folder onto the page. You'll get an address like `https://forkcast-123.netlify.app`.
3. Put that address in `.env`:

   ```
   EXPO_PUBLIC_SHARE_URL=https://forkcast-123.netlify.app
   ```

4. Run step 1 again and re-upload `dist`.

Now **Invite friends** sends a link like `https://forkcast-123.netlify.app/j/ABCD`. It opens straight onto the join screen, in any browser, with no install.

---

## If something goes wrong

| What you see | Fix |
|---|---|
| "The app isn't connected to Supabase yet" | Check `.env` (step 5), then stop and restart `npx expo start`. |
| "Couldn't sign in as a guest" | Turn on anonymous sign-ins (step 2.2). |
| "The GOOGLE_PLACES_KEY secret isn't set" | Add the secret (step 4) and redeploy the function. |
| "Google Places: … API has not been used / is disabled" | Enable **Places API (New)**. The older "Places API" is a different product. |
| "Couldn't reach the server" | Check the function is named exactly `places` and is deployed. |
| Group screens don't update live | Re-run the SQL in step 3. The last part switches on live updates. The app also refreshes every 5 seconds as a backup. |
| No hygiene rating on a place | The name on Google didn't match the Food Standards Agency record closely enough. It's best-effort. |

## Costs

- **Google** charges per search, photo and detail lookup after the free monthly allowance. Each search makes 1 to 4 requests. Photos load only when a card shows them. Keep the budget alert from step 4.
- **Supabase's free plan** is plenty for testing. Free projects pause after about a week with no use; press **Restore** in the dashboard to wake yours up.

## What's in the project

```
src/app/                 Screens (every file is a screen)
  index.tsx              Home
  search.tsx             Location, budget, cuisine, distance, diet, chains
  results.tsx            List of places, sort, Surprise me
  place/[id].tsx         Photos, reviews, hours, menu link, directions, call
  group/names.tsx        Pass-the-phone: who's eating
  group/local.tsx        Pass-the-phone: turns, swiping, result
  group/[code].tsx       Online group: lobby, swiping, waiting, result
  join.tsx, j/[code].tsx Join by code or by share link
src/components/          Swipe deck, tie-break wheel, place cards, buttons
src/lib/                 Supabase, API calls, group logic, vote counting, theme
supabase/functions/places/   Google + Food Standards Agency lookups
supabase/migrations/         Group tables and access rules
```

## Next steps after this works

- **Your own app icon and name**, then real installable builds with EAS: `npx eas-cli@latest build`.
- **Meet in the middle**: suggest places that are fair on everyone's travel time.
- **Favourites and "been there"**.
- **Promoted listings** for paying restaurants. Always label them "Promoted", and never let them change votes.
