import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { photoUri, type Hygiene, type PlaceSummary } from "@/lib/api";
import { hueFor, priceLabel } from "@/lib/constants";
import { radius, useColors } from "@/lib/theme";
import { Badge } from "./ui";

/** A Google photo, or a coloured block with the place's type if there isn't one. */
export function PlacePhoto({
  name, photo, label, height, style, width = 800,
}: { name: string; photo: string | null; label: string; height: number; style?: StyleProp<ViewStyle>; width?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUri(null);
    if (photo) photoUri(photo, width).then((u) => live && setUri(u)).catch(() => {});
    return () => {
      live = false;
    };
  }, [photo, width]);
  const hue = hueFor(name);
  return (
    <View style={[{ height, backgroundColor: `hsl(${hue}, 45%, 38%)`, overflow: "hidden" }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Text numberOfLines={1} style={s.artWord}>{label}</Text>
      )}
    </View>
  );
}

export function hygieneText(h: Hygiene | null): string | null {
  if (!h || !h.value) return null;
  if (/^[0-5]$/.test(h.value)) return `Hygiene ${h.value}/5`;
  if (h.value === "Pass" || h.value === "Pass and Eat Safe") return "Hygiene: Pass";
  if (/improvement/i.test(h.value)) return "Hygiene: Improvement required";
  if (/awaiting/i.test(h.value)) return "Hygiene: Awaiting inspection";
  return null;
}

export function Stars({ rating, count }: { rating: number | null; count: number }) {
  const c = useColors();
  if (rating == null) return <Text style={{ color: c.muted, fontSize: 14 }}>No Google rating yet</Text>;
  return (
    <Text style={{ fontSize: 15 }}>
      <Text style={{ color: c.star, fontWeight: "700" }}>★ {rating.toFixed(1)}</Text>
      <Text style={{ color: c.muted }}> ({count.toLocaleString("en-GB")})</Text>
    </Text>
  );
}

export function PlaceBadges({ p }: { p: PlaceSummary }) {
  const hy = hygieneText(p.hygiene);
  return (
    <View style={s.badges}>
      <Badge text={p.chain ? "Chain" : "Independent"} tone={p.chain ? "muted" : "good"} />
      {p.openNow === true ? <Badge text="Open now" tone="good" /> : p.openNow === false ? <Badge text="Closed now" tone="muted" /> : null}
      {hy ? <Badge text={hy} /> : null}
      {p.vegetarian ? <Badge text="Vegetarian options" /> : null}
    </View>
  );
}

export const metaLine = (p: PlaceSummary) =>
  `${p.type} · ${priceLabel(p.priceLevel)} · ${p.distanceMi.toFixed(1)} mi`;

export function PlaceRow({ p, onPress }: { p: PlaceSummary; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${metaLine(p)}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 }]}
    >
      <PlacePhoto name={p.name} photo={p.photo} label={p.type} height={72} width={300} style={{ width: 72, borderRadius: 10 }} />
      <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
        <Text style={[s.rowTitle, { color: c.ink }]} numberOfLines={2}>{p.name}</Text>
        <Text style={{ color: c.muted, fontSize: 14 }} numberOfLines={1}>{metaLine(p)}</Text>
        <Stars rating={p.rating} count={p.ratingCount} />
        <PlaceBadges p={p} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  artWord: { position: "absolute", left: 10, bottom: 8, right: 10, color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  row: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: radius, padding: 12, alignItems: "flex-start" },
  rowTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
});
