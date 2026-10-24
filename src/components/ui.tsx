import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { radius, space, useColors } from "@/lib/theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const c = useColors();
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.ink }, style]} accessibilityRole="header">{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.h2, { color: c.ink }]} accessibilityRole="header">{children}</Text>;
}
export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.body, { color: muted ? c.muted : c.ink }, style]}>{children}</Text>;
}
export function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.muted }]}>{children}</Text>;
}

type BtnKind = "primary" | "secondary" | "ghost";
export function Button({
  title, onPress, kind = "primary", disabled, loading, style,
}: { title: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = kind === "primary" ? c.accent : kind === "secondary" ? c.sunk : "transparent";
  const fg = kind === "primary" ? c.accentInk : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        kind === "ghost" && { borderWidth: 1, borderColor: c.line },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Choice({ title, sub, onPress, disabled }: { title: string; sub: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { backgroundColor: c.surface, borderColor: c.line, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.choiceTitle, { color: c.ink }]}>{title}</Text>
      <Text style={{ color: c.muted, fontSize: 15 }}>{sub}</Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string | number>({
  options, value, onChange, multi = true,
}: { options: readonly { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole={multi ? "checkbox" : "radio"}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id])}
            style={[styles.chip, { borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }]}
          >
            <Text style={{ color: on ? c.bg : c.ink, fontWeight: "500", fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ title, sub, value, onChange }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <View style={[styles.toggle, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontWeight: "600", fontSize: 16 }}>{title}</Text>
        {sub ? <Text style={{ color: c.muted, fontSize: 14 }}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.yes, false: c.sunk }} accessibilityLabel={title} />
    </View>
  );
}

export function Badge({ text, tone = "plain" }: { text: string; tone?: "plain" | "good" | "muted" | "promo" }) {
  const c = useColors();
  const fg = tone === "good" ? c.yes : tone === "muted" ? c.muted : c.ink;
  return (
    <View style={[styles.badge, { backgroundColor: c.sunk }]}>
      <Text style={{ color: fg, fontSize: 12.5, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 9 }}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

export function Notice({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: c.sunk, borderColor: tone === "error" ? c.accent : c.sunk }]}>
      <Text style={{ color: c.ink, fontSize: 14.5, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function Loading({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
      <ActivityIndicator color={c.accent} size="large" />
      <Text style={{ color: c.muted }}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: "center", paddingHorizontal: space, paddingTop: 18, paddingBottom: 40 },
  inner: { width: "100%", maxWidth: 480, gap: 18 },
  title: { fontSize: 34, lineHeight: 36, fontWeight: "800", letterSpacing: -1 },
  h2: { fontSize: 22, lineHeight: 25, fontWeight: "800", letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  btn: { minHeight: 50, borderRadius: 999, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "700" },
  choice: { borderWidth: 1, borderRadius: radius, padding: 18, gap: 4 },
  choiceTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, minHeight: 40, justifyContent: "center" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  notice: { borderRadius: 12, padding: 12, borderWidth: 1 },
});
