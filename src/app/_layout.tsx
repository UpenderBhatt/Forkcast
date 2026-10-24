import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useColors } from "@/lib/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useColors();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.bg, card: c.bg, text: c.ink, primary: c.accent, border: c.line } }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: c.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Forkcast" }} />
        <Stack.Screen name="search" options={{ title: "Find food" }} />
        <Stack.Screen name="results" options={{ title: "Places" }} />
        <Stack.Screen name="surprise" options={{ title: "Surprise me" }} />
        <Stack.Screen name="place/[id]" options={{ title: "" }} />
        <Stack.Screen name="group/index" options={{ title: "Group" }} />
        <Stack.Screen name="group/names" options={{ title: "Who's eating?" }} />
        <Stack.Screen name="group/local" options={{ title: "Pass the phone", gestureEnabled: false }} />
        <Stack.Screen name="group/[code]" options={{ title: "Group", gestureEnabled: false }} />
        <Stack.Screen name="join" options={{ title: "Join a group" }} />
        <Stack.Screen name="j/[code]" options={{ title: "Join a group" }} />
      </Stack>
    </ThemeProvider>
  );
}
