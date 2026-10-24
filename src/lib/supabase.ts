import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** False until you've filled in .env (see SETUP.md). The app shows a setup message instead of crashing. */
export const isConfigured = Boolean(url && key && !url.includes("YOUR-PROJECT"));

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  auth: {
    // On the web build, supabase-js uses the browser's own storage.
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the sign-in fresh only while the app is open (recommended by Supabase for React Native).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

let signingIn: Promise<string> | null = null;

/** Signs the person in as an anonymous guest the first time. No account or email needed. */
export function ensureSignedIn(): Promise<string> {
  if (!isConfigured) return Promise.reject(new Error(NOT_SET_UP));
  if (!signingIn) {
    signingIn = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user.id;
      const res = await supabase.auth.signInAnonymously();
      if (res.error || !res.data.user) {
        throw new Error(
          "Couldn't sign in as a guest. In Supabase, turn on Authentication > Sign In / Providers > Allow anonymous sign-ins (SETUP.md, step 2).",
        );
      }
      return res.data.user.id;
    })().catch((e) => {
      signingIn = null;
      throw e;
    });
  }
  return signingIn;
}

export const NOT_SET_UP = "The app isn't connected to Supabase yet. Fill in the .env file (SETUP.md, step 5) and restart.";
