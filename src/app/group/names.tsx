import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Body, Button, Notice, Screen, Title } from "@/components/ui";
import { useApp } from "@/lib/store";
import { useColors } from "@/lib/theme";

export default function Names() {
  const c = useColors();
  const { players, setPlayers } = useApp();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const n = name.trim().slice(0, 20);
    if (!n) return;
    if (players.length >= 8) return setError("8 people max for one phone.");
    if (players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return setError(`${n} is already in.`);
    setError(null);
    setPlayers([...players, { name: n, swipes: "", veto: null }]);
    setName("");
  }

  return (
    <Screen>
      <Title>Who's eating?</Title>
      <Body muted>Add everyone at the table. Each person swipes on their own turn.</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="Name"
          placeholderTextColor={c.muted}
          maxLength={20}
          returnKeyType="done"
          accessibilityLabel="Name"
          style={{ flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 17, borderColor: c.line, backgroundColor: c.surface, color: c.ink }}
        />
        <Button title="Add" kind="secondary" onPress={add} />
      </View>
      {error ? <Notice tone="error" text={error} /> : null}
      <View style={{ gap: 8 }}>
        {players.map((p, i) => (
          <View key={p.name} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
            <Text style={{ color: c.ink, fontWeight: "600", flex: 1 }} numberOfLines={1}>{p.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} onPress={() => setPlayers(players.filter((_, j) => j !== i))} hitSlop={8}>
              <Text style={{ color: c.accent, fontWeight: "600" }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Button
        title={players.length < 2 ? "Add at least 2 people" : `Next: choose food for ${players.length}`}
        disabled={players.length < 2}
        onPress={() => router.push("/search?mode=local")}
      />
    </Screen>
  );
}
