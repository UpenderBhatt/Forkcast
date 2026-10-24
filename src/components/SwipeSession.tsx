import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { PlaceSummary } from "@/lib/api";
import { useColors } from "@/lib/theme";
import { metaLine, PlaceBadges, PlacePhoto, Stars } from "./place";

type Props = {
  deck: PlaceSummary[];
  label: string;
  /** Epoch ms when voting closes, for online groups. */
  endsAt?: number | null;
  onProgress?: (swipes: string, veto: string | null) => void;
  onFinish: (swipes: string, veto: string | null) => void;
};

const NATIVE = Platform.OS !== "web";

export function SwipeSession({ deck, label, endsAt, onProgress, onFinish }: Props) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const [veto, setVeto] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const st = useRef({ i: 0, swipes: "", veto: null as string | null, busy: false, finished: false });
  const pos = useRef(new Animated.ValueXY()).current;

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const finish = (swipes: string, v: string | null) => {
    if (st.current.finished) return;
    st.current.finished = true;
    onFinishRef.current(swipes, v);
  };

  const decide = (kind: "yes" | "no" | "veto") => {
    const s = st.current;
    if (s.busy || s.finished || s.i >= deck.length) return;
    const place = deck[s.i];
    if (kind === "veto") {
      if (s.veto) return;
      s.veto = place.id;
      setVeto(place.id);
    }
    s.swipes += kind === "yes" ? "1" : "0";
    s.busy = true;
    const dir = kind === "yes" ? 1 : -1;
    Animated.timing(pos, {
      toValue: kind === "veto" ? { x: 0, y: -600 } : { x: dir * width * 1.3, y: 40 },
      duration: 220,
      useNativeDriver: NATIVE,
    }).start(() => {
      pos.setValue({ x: 0, y: 0 });
      s.i += 1;
      s.busy = false;
      setI(s.i);
      onProgress?.(s.swipes, s.veto);
      if (s.i >= deck.length) finish(s.swipes, s.veto);
    });
  };
  const decideRef = useRef(decide);
  decideRef.current = decide;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => pos.setValue({ x: g.dx, y: g.dy * 0.25 }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 100 || g.vx > 0.8) decideRef.current("yes");
        else if (g.dx < -100 || g.vx < -0.8) decideRef.current("no");
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: NATIVE }).start();
      },
      onPanResponderTerminate: () => Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: NATIVE }).start(),
    }),
  ).current;

  // Timer for online groups. When it runs out, anything unswiped counts as a no.
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = endsAt - Date.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && !st.current.finished) {
        st.current.swipes = st.current.swipes.padEnd(deck.length, "0");
        finish(st.current.swipes, st.current.veto);
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, deck.length]);

  // Arrow keys on the web version.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") decideRef.current("yes");
      if (e.key === "ArrowLeft") decideRef.current("no");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rotate = pos.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-12deg", "0deg", "12deg"] });
  const yesOpacity = pos.x.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: "clamp" });
  const noOpacity = pos.x.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: "clamp" });

  const current = deck[i];
  const next = deck[i + 1];
  const mm = left == null ? "" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={s.top}>
        <Text style={[s.who, { color: c.ink }]} numberOfLines={1}>{label}</Text>
        {left != null ? (
          <Text style={[s.timer, { backgroundColor: left <= 20 ? c.accent : c.sunk, color: left <= 20 ? c.accentInk : c.ink }]}>{mm}</Text>
        ) : null}
      </View>
      <View>
        <View style={[s.track, { backgroundColor: c.sunk }]}>
          <View style={{ height: "100%", width: `${(i / Math.max(1, deck.length)) * 100}%`, backgroundColor: c.ink }} />
        </View>
        <Text style={{ color: c.muted, fontSize: 14, marginTop: 6 }}>
          Card {Math.min(i + 1, deck.length)} of {deck.length}
        </Text>
      </View>

      <View style={{ flex: 1, minHeight: 400 }}>
        {next ? (
          <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line, transform: [{ translateY: 12 }, { scale: 0.95 }], opacity: 0.6 }]} pointerEvents="none">
            <Card p={next} />
          </View>
        ) : null}
        {current ? (
          <Animated.View
            {...pan.panHandlers}
            style={[s.card, { backgroundColor: c.surface, borderColor: c.line, transform: [...pos.getTranslateTransform(), { rotate }] }]}
          >
            <Card p={current} />
            <Animated.Text style={[s.stamp, s.stampYes, { opacity: yesOpacity }]}>YES</Animated.Text>
            <Animated.Text style={[s.stamp, s.stampNo, { opacity: noOpacity }]}>NOPE</Animated.Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="No" onPress={() => decide("no")} style={[s.act, { backgroundColor: c.sunk }]}>
          <Text style={[s.actText, { color: c.ink }]}>✕  No</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={veto ? "Veto already used" : "Veto this place. One per person."}
          disabled={!!veto}
          onPress={() => decide("veto")}
          style={[s.veto, { borderColor: c.veto, opacity: veto ? 0.4 : 1 }]}
        >
          <Text style={{ color: c.veto, fontWeight: "700", fontSize: 14 }}>{veto ? "Veto used" : "Veto (1)"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Yes" onPress={() => decide("yes")} style={[s.act, { backgroundColor: c.yes }]}>
          <Text style={[s.actText, { color: c.yesInk }]}>✓  Yes</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Card({ p }: { p: PlaceSummary }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <PlacePhoto name={p.name} photo={p.photo} label={p.type} height={190} />
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: c.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.6 }} numberOfLines={2}>{p.name}</Text>
        <Text style={{ color: c.muted, fontSize: 14.5 }}>{metaLine(p)}</Text>
        <Stars rating={p.rating} count={p.ratingCount} />
        <PlaceBadges p={p} />
        {p.address ? <Text style={{ color: c.muted, fontSize: 14 }} numberOfLines={1}>{p.address}</Text> : null}
        <Pressable accessibilityRole="link" onPress={() => router.push(`/place/${p.id}`)} hitSlop={8}>
          <Text style={{ color: c.accent, fontWeight: "700", paddingVertical: 4 }}>Photos, reviews & menu link</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  who: { fontSize: 22, fontWeight: "800", flexShrink: 1 },
  timer: { fontSize: 20, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: "hidden", fontVariant: ["tabular-nums"] },
  track: { height: 6, borderRadius: 999, overflow: "hidden" },
  card: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  stamp: { position: "absolute", top: 18, fontSize: 28, fontWeight: "800", color: "#FFFFFF", borderWidth: 3, borderColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "rgba(0,0,0,0.3)", overflow: "hidden" },
  stampYes: { left: 16, transform: [{ rotate: "-10deg" }] },
  stampNo: { right: 16, transform: [{ rotate: "10deg" }] },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  act: { flex: 1, minHeight: 58, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  actText: { fontSize: 17, fontWeight: "700" },
  veto: { minHeight: 48, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
