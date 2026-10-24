import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import type { PlaceSummary } from "@/lib/api";
import { hueFor } from "@/lib/constants";
import type { Result } from "@/lib/results";
import { useColors } from "@/lib/theme";
import { metaLine, PlaceBadges, PlacePhoto, Stars } from "./place";
import { Body, Button, H2, Label, Title } from "./ui";

export function directionsUrl(p: PlaceSummary) {
  return p.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}&query_place_id=${p.id}`;
}

export function Wheel({ items, winner, onDone }: { items: { id: string; name: string }[]; winner: string; onDone: () => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const size = Math.min(310, width - 64);
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;
  const n = items.length, a = 360 / n;
  const rot = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const w = Math.max(0, items.findIndex((x) => x.id === winner));
    const jitter = (Math.random() - 0.5) * a * 0.6;
    const target = 360 * 6 - (w + 0.5) * a + jitter;
    Animated.timing(rot, {
      toValue: target,
      duration: 4200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => doneRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pt = (deg: number) => {
    const t = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  };
  const spin = rot.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ alignItems: "center", paddingTop: 10 }} accessibilityLabel={`Tie-break wheel: ${items.map((x) => x.name).join(", ")}`}>
      <View style={[st.pin, { borderTopColor: c.ink }]} />
      <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }] }}>
        <Svg width={size} height={size}>
          {items.map((it, i) => {
            const start = -90 + i * a, end = start + a;
            const [x1, y1] = pt(start), [x2, y2] = pt(end);
            const d = n === 1
              ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
              : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
            const label = it.name.length > 16 ? it.name.slice(0, 15) + "…" : it.name;
            return (
              <G key={it.id}>
                <Path d={d} fill={`hsl(${hueFor(it.name)}, 50%, ${i % 2 ? 34 : 42}%)`} stroke={c.surface} strokeWidth={2} />
                <SvgText
                  x={cx + r - 12}
                  y={cy + 5}
                  fill="#FFFFFF"
                  fontSize={n > 5 ? 12 : 14}
                  fontWeight="700"
                  textAnchor="end"
                  transform={`rotate(${start + a / 2}, ${cx}, ${cy})`}
                >
                  {label}
                </SvgText>
              </G>
            );
          })}
          <Circle cx={cx} cy={cy} r={22} fill={c.surface} stroke={c.ink} strokeWidth={2} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function Outcome({
  result, places, kind, onStartOver,
}: { result: Result; places: Record<string, PlaceSummary>; kind: "group" | "solo"; onStartOver: () => void }) {
  const c = useColors();
  const needsSpin = result.tie.length > 1;
  const [revealed, setRevealed] = useState(!needsSpin);

  if (!result.w) {
    return (
      <View style={{ gap: 16 }}>
        <Title>Every place got vetoed</Title>
        <Body muted>Tough crowd. Start again with different filters.</Body>
        <Button title="Start over" kind="ghost" onPress={onStartOver} />
      </View>
    );
  }
  const p = places[result.w];
  if (!p) return <Body muted>Loading the winner…</Body>;
  const top = result.r.find((x) => x[0] === result.w);

  if (!revealed) {
    const nobody = kind === "group" && top && top[1] === 0;
    return (
      <View style={{ gap: 12 }}>
        <Label>{kind === "solo" ? "Surprise me" : "Tie-break"}</Label>
        <Title>
          {kind === "solo"
            ? `Spinning between your top ${result.tie.length}`
            : nobody
              ? "Nobody swiped yes. The wheel decides."
              : `It's a ${result.tie.length}-way tie. The wheel decides.`}
        </Title>
        <Wheel
          items={result.tie.map((id) => ({ id, name: places[id]?.name ?? "?" }))}
          winner={result.w}
          onDone={() => setTimeout(() => setRevealed(true), 500)}
        />
      </View>
    );
  }

  let line = "Picked by the wheel from your top results";
  if (kind === "group") {
    const yes = top ? top[1] : 0;
    line = yes === result.n && result.n > 0
      ? `Everyone said yes (${yes} of ${result.n})`
      : `${yes} of ${result.n} said yes${needsSpin ? ", then won the spin" : ""}`;
  }

  return (
    <View style={{ gap: 16 }}>
      <Label>You're eating at</Label>
      <View style={[st.winner, { backgroundColor: c.surface, borderColor: c.line }]}>
        <PlacePhoto name={p.name} photo={p.photo} label={p.type} height={170} />
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={{ color: c.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.8 }}>{p.name}</Text>
          <Text style={{ color: c.muted }}>{metaLine(p)}</Text>
          <Text style={{ color: c.ink, fontWeight: "700" }}>{line}</Text>
          <Stars rating={p.rating} count={p.ratingCount} />
          <PlaceBadges p={p} />
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Button title="Directions" onPress={() => Linking.openURL(directionsUrl(p))} style={{ flexGrow: 1 }} />
            <Button title="Reviews & menu" kind="secondary" onPress={() => router.push(`/place/${p.id}`)} style={{ flexGrow: 1 }} />
          </View>
        </View>
      </View>

      {kind === "group" && result.r.length ? (
        <View style={{ gap: 10 }}>
          <H2>How the votes went</H2>
          {result.r.map(([id, yes, vetoed]) => (
            <View key={id} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: vetoed ? c.muted : c.ink, flex: 1, textDecorationLine: vetoed ? "line-through" : "none" }}
                >
                  {places[id]?.name ?? "A place"}
                </Text>
                <Text style={{ color: vetoed ? c.veto : c.muted, fontWeight: vetoed ? "700" : "400" }}>
                  {vetoed ? "Vetoed" : `${yes} of ${result.n}`}
                </Text>
              </View>
              <View style={[st.bar, { backgroundColor: c.sunk }]}>
                <View style={{ height: "100%", backgroundColor: c.yes, width: `${vetoed || !result.n ? 0 : (yes / result.n) * 100}%` }} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Button title="Start over" kind="ghost" onPress={onStartOver} />
    </View>
  );
}

const st = StyleSheet.create({
  pin: {
    width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderTopWidth: 24,
    borderLeftColor: "transparent", borderRightColor: "transparent", marginBottom: -12, zIndex: 2,
  },
  winner: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  bar: { height: 8, borderRadius: 999, overflow: "hidden" },
});
