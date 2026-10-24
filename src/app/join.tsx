import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";
import { Button, ChipGroup, Field, Notice, Screen, Title } from "@/components/ui";
import { DIETS } from "@/lib/constants";
import { cleanCode, joinGroup } from "@/lib/groups";
import { useColors } from "@/lib/theme";

export default function Join() {
  const c = useColors();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(cleanCode(String(params.code ?? "")));
  const [name, setName] = useState("");
  const [diets, setDiets] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 17, borderColor: c.line, backgroundColor: c.surface, color: c.ink } as const;

  async function submit() {
    setError(null);
    if (code.length !== 4) return setError("Group codes are 4 letters.");
    const who = name.trim().slice(0, 20);
    if (!who) return setError("Add your name so the group knows who you are.");
    setBusy(true);
    try {
      await joinGroup(code, who, diets);
      router.replace(`/group/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Join a group</Title>
      <Field label="Group code">
        <TextInput
          value={code}
          onChangeText={(t) => setCode(cleanCode(t))}
          placeholder="ABCD"
          placeholderTextColor={c.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={4}
          accessibilityLabel="Group code"
          style={[input, { fontSize: 30, fontWeight: "800", letterSpacing: 8, textAlign: "center" }]}
        />
      </Field>
      <Field label="Your name">
        <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={c.muted} maxLength={20} accessibilityLabel="Your name" style={input} />
      </Field>
      <Field label="Your dietary needs">
        <ChipGroup options={DIETS} value={diets} onChange={setDiets} />
      </Field>
      {error ? <Notice tone="error" text={error} /> : null}
      <Button title="Join" onPress={submit} loading={busy} />
    </Screen>
  );
}
