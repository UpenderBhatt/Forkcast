import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button, ChipGroup, Field, Notice, Screen, Title, ToggleRow } from "@/components/ui";
import { geocode } from "@/lib/api";
import { CUISINES, DIETS, DISTANCES, MINUTES, PRICES } from "@/lib/constants";
import { createGroup } from "@/lib/groups";
import { buildDeck, runSearch, useApp, type GroupSettings } from "@/lib/store";
import { useColors } from "@/lib/theme";

type Mode = "solo" | "local" | "host";

export default function Search() {
  const c = useColors();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = params.mode === "local" || params.mode === "host" ? params.mode : "solo";
  const { settings: s, setSettings, players, setLocalDeck } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = { borderColor: c.line, backgroundColor: c.surface, color: c.ink };

  async function useMyLocation() {
    setError(null);
    setLocBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError("Location permission was turned down. Type a town or postcode instead.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setSettings({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, locationLabel: "your location", locationText: "" });
    } catch {
      setError("Couldn't get your location. Type a town or postcode instead.");
    } finally {
      setLocBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (!s.coords && !s.locationText.trim()) {
      setError("Add a location, or tap “Use my location”.");
      return;
    }
    if (mode === "solo") {
      router.push("/results");
      return;
    }
    setBusy(true);
    try {
      if (mode === "local") {
        const res = await runSearch(s);
        if (!res.places.length) throw new Error("Nothing matches those filters. Try more cuisines, another budget or a longer distance.");
        setLocalDeck(buildDeck(res.places));
        router.push("/group/local");
      } else {
        const who = name.trim().slice(0, 20);
        if (!who) throw new Error("Add your name so friends know whose group it is.");
        let { coords, locationLabel } = s;
        if (!coords) {
          const g = await geocode(s.locationText.trim());
          coords = { lat: g.lat, lng: g.lng };
          locationLabel = g.label;
          setSettings({ coords, locationLabel });
        }
        const { locationText: _unused, ...rest } = s;
        const gs: GroupSettings = { ...rest, coords, locationLabel };
        const code = await createGroup(who, s.diets, gs);
        router.replace(`/group/${code}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "solo" ? "What are you in the mood for?" : mode === "local" ? `Food for ${players.length || "the group"}` : "Set up your group";
  const dietLabel = mode === "solo" ? "Dietary needs" : mode === "local" ? "Does anyone need…" : "Your dietary needs (friends add theirs when they join)";
  const cta = mode === "solo" ? "Show places" : mode === "local" ? "Start swiping" : "Create group";

  return (
    <Screen>
      <Title>{title}</Title>
      {mode === "host" ? (
        <Field label="Your name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="So friends know whose group it is"
            placeholderTextColor={c.muted}
            maxLength={20}
            style={[inputStyle, input]}
            accessibilityLabel="Your name"
          />
        </Field>
      ) : null}
      <Field label="Location">
        <TextInput
          value={s.coords && !s.locationText ? "" : s.locationText}
          onChangeText={(t) => setSettings({ locationText: t, coords: null, locationLabel: "" })}
          placeholder={s.coords && !s.locationText ? "Using your location" : "Town, city or postcode"}
          placeholderTextColor={s.coords && !s.locationText ? c.yes : c.muted}
          maxLength={60}
          autoCorrect={false}
          style={[inputStyle, input]}
          accessibilityLabel="Location"
        />
        <Pressable onPress={useMyLocation} accessibilityRole="button" hitSlop={8} disabled={locBusy}>
          <Text style={{ color: c.accent, fontWeight: "700" }}>
            {locBusy ? "Finding you…" : s.coords && !s.locationText ? "✓ Using your location" : "Use my location"}
          </Text>
        </Pressable>
      </Field>
      <Field label="Budget per person">
        <ChipGroup options={PRICES} value={s.budgets} onChange={(budgets) => setSettings({ budgets })} />
      </Field>
      <Field label="Cuisine (pick up to 4, or none for everything)">
        <ChipGroup
          options={CUISINES}
          value={s.cuisines}
          onChange={(cuisines) => setSettings({ cuisines: cuisines.slice(-4) })}
        />
      </Field>
      <Field label="How far will you go?">
        <ChipGroup options={DISTANCES} value={[s.miles]} multi={false} onChange={([miles]) => setSettings({ miles })} />
      </Field>
      <Field label={dietLabel}>
        <ChipGroup options={DIETS} value={s.diets} onChange={(diets) => setSettings({ diets })} />
      </Field>
      {mode === "host" ? (
        <Field label="Time to swipe">
          <ChipGroup options={MINUTES} value={[s.minutes]} multi={false} onChange={([minutes]) => setSettings({ minutes })} />
        </Field>
      ) : null}
      <ToggleRow title="Hide chains" sub="McDonald's, KFC, Nando's and the like" value={s.hideChains} onChange={(hideChains) => setSettings({ hideChains })} />
      <ToggleRow title="Open now only" value={s.openNow} onChange={(openNow) => setSettings({ openNow })} />
      {error ? <Notice tone="error" text={error} /> : null}
      <View>
        <Button title={cta} onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const inputStyle = { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 17 } as const;
