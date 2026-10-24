import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PlaceRow } from "@/components/place";
import { Body, Button, Label, Loading, Notice, Screen, Title } from "@/components/ui";
import type { PlaceSummary } from "@/lib/api";
import { runSearch, useApp } from "@/lib/store";
import { useColors } from "@/lib/theme";

export default function Results() {
  const c = useColors();
  const settings = useApp((st) => st.settings);
  const [places, setPlaces] = useState<PlaceSummary[] | null>(null);
  const [hidden, setHidden] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"best" | "near">("best");

  const load = useCallback(async () => {
    setError(null);
    setPlaces(null);
    try {
      const res = await runSearch(useApp.getState().settings);
      setPlaces(res.places);
      setHidden(res.hiddenChains);
      setLabel(res.label);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(
    () => (places ? (sort === "near" ? [...places].sort((a, b) => a.distanceMi - b.distanceMi) : places) : []),
    [places, sort],
  );

  if (error) {
    return (
      <Screen>
        <Title>Couldn't search</Title>
        <Notice tone="error" text={error} />
        <Button title="Try again" onPress={load} />
      </Screen>
    );
  }
  if (!places) return <Screen><Loading text="Finding places near you…" /></Screen>;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Label>{label ? `Near ${label}` : "Near you"}</Label>
        <Title>{places.length ? `${places.length} place${places.length === 1 ? "" : "s"} to try` : "Nothing matches yet"}</Title>
      </View>
      <Body muted>
        {places.length
          ? `${hidden ? `${hidden} chain${hidden === 1 ? "" : "s"} hidden. ` : ""}Tap a place for photos, reviews and its menu.`
          : "Try another budget, more cuisines or a longer distance."}
      </Body>
      {places.length ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", backgroundColor: c.sunk, borderRadius: 999, padding: 3 }}>
            {(["best", "near"] as const).map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityState={{ selected: sort === k }}
                onPress={() => setSort(k)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: sort === k ? c.surface : "transparent" }}
              >
                <Text style={{ color: sort === k ? c.ink : c.muted, fontWeight: "600" }}>{k === "best" ? "Best match" : "Closest"}</Text>
              </Pressable>
            ))}
          </View>
          <Button
            title="Surprise me"
            kind="secondary"
            disabled={places.length < 2}
            onPress={() => router.push(`/surprise?ids=${places.slice(0, 8).map((p) => p.id).join(",")}`)}
          />
        </View>
      ) : (
        <Button title="Change filters" kind="secondary" onPress={() => router.back()} />
      )}
      <View style={{ gap: 10 }}>
        {list.map((p) => <PlaceRow key={p.id} p={p} onPress={() => router.push(`/place/${p.id}`)} />)}
      </View>
      {settings.budgets.length ? <Body muted style={{ fontSize: 13 }}>Places that don't list a price are included, as many independents never set one.</Body> : null}
      <Body muted style={{ fontSize: 13 }}>Ratings and photos from Google. Hygiene ratings from the Food Standards Agency.</Body>
    </Screen>
  );
}
