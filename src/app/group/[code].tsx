import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Share, Text, View } from "react-native";
import { Outcome } from "@/components/Outcome";
import { SwipeSession } from "@/components/SwipeSession";
import { Badge, Body, Button, Label, Loading, Notice, Screen, Title } from "@/components/ui";
import { DIET_LABEL, SHARE_URL } from "@/lib/constants";
import { cleanCode, finishGroup, leaveGroup, saveVotes, startGroup, useGroup, type GroupRow, type MemberRow } from "@/lib/groups";
import { goHome } from "@/lib/nav";
import { computeResult, isResult } from "@/lib/results";
import { buildDeck, runSearch, useApp } from "@/lib/store";
import { useColors } from "@/lib/theme";

export default function OnlineGroup() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = cleanCode(String(params.code ?? ""));
  const { group, members, me, error, loaded, reload } = useGroup(code);
  const remember = useApp((s) => s.remember);

  // Keep deck places on hand for the detail screen.
  useEffect(() => {
    if (group?.deck?.length) remember(group.deck);
  }, [group?.deck, remember]);

  const isHost = !!group && !!me && group.host_id === me;
  const mine = members.find((m) => m.user_id === me);

  // The host's phone closes voting when everyone's done or time is up.
  const finishing = useRef(false);
  useEffect(() => {
    if (!isHost || !group || group.status !== "swiping") return;
    const check = () => {
      if (finishing.current) return;
      const ends = group.ends_at ? Date.parse(group.ends_at) : 0;
      const allDone = members.length > 0 && members.every((m) => m.done);
      if (allDone || (ends && Date.now() > ends + 3000)) {
        finishing.current = true;
        finishGroup(code, computeResult(group.deck.map((p) => p.id), members)).catch(() => {
          finishing.current = false;
        });
      }
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [isHost, group, members, code]);

  if (error) {
    return (
      <Screen>
        <Notice tone="error" text={error} />
        <Button title="Try again" onPress={reload} />
      </Screen>
    );
  }
  if (!loaded) return <Screen><Loading text="Joining the group…" /></Screen>;
  if (!group) {
    return (
      <Screen>
        <Title>Group {code} isn't here</Title>
        <Body muted>It may have been deleted. Ask whoever set it up for a fresh code.</Body>
        <Button title="Home" onPress={goHome} />
      </Screen>
    );
  }

  if (group.status === "results" && isResult(group.result)) {
    const places = Object.fromEntries(group.deck.map((p) => [p.id, p]));
    return (
      <Screen>
        <Outcome result={group.result} places={places} kind="group" onStartOver={goHome} />
      </Screen>
    );
  }

  if (!mine) {
    return (
      <Screen>
        <Title>You're not in group {code} yet</Title>
        <Button title="Join this group" onPress={() => router.replace(`/join?code=${code}`)} />
      </Screen>
    );
  }

  if (group.status === "swiping") {
    if (mine.done) return <Waiting members={members} me={me} isHost={isHost} onEnd={() => {
      if (finishing.current) return;
      finishing.current = true;
      finishGroup(code, computeResult(group.deck.map((p) => p.id), members)).catch(() => { finishing.current = false; });
    }} />;
    return (
      <Screen scroll={false}>
        <SwipeSession
          deck={group.deck}
          label={`Group ${code}`}
          endsAt={group.ends_at ? Date.parse(group.ends_at) : null}
          onProgress={(s, v) => { saveVotes(code, s, v, false).catch(() => {}); }}
          onFinish={(s, v) => { saveVotes(code, s, v, true).then(reload).catch(() => {}); }}
        />
      </Screen>
    );
  }

  return <Lobby group={group} members={members} me={me} isHost={isHost} />;
}

function Person({ m, me, host }: { m: MemberRow; me: string | null; host: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, flexWrap: "wrap" }}>
      <Text style={{ color: c.ink, fontWeight: "600", flexShrink: 1 }} numberOfLines={1}>{m.name}</Text>
      {m.user_id === host ? <Badge text="Host" /> : null}
      {m.user_id === me ? <Badge text="You" tone="good" /> : null}
      {m.diets.map((d) => <Badge key={d} text={DIET_LABEL[d] ?? d} />)}
    </View>
  );
}

function Lobby({ group, members, me, isHost }: { group: GroupRow; members: MemberRow[]; me: string | null; isHost: boolean }) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const s = group.settings;
  const link = SHARE_URL ? `${SHARE_URL}/j/${group.code}` : null;
  const hostName = members.find((m) => m.user_id === group.host_id)?.name ?? "the host";

  const summary = useMemo(() => {
    const parts = [s.cuisines?.length ? `${s.cuisines.length} cuisine${s.cuisines.length > 1 ? "s" : ""}` : "Any cuisine"];
    if (s.budgets?.length) parts.push([...s.budgets].sort().map((b) => "£".repeat(b)).join(" / "));
    parts.push(`within ${s.miles} mi`);
    if (s.hideChains) parts.push("chains hidden");
    return `${s.locationLabel ? `Near ${s.locationLabel}: ` : ""}${parts.join(" · ")}`;
  }, [s]);

  async function share() {
    const message = link
      ? `Help pick where we eat! Join my Forkcast group: ${link} (code ${group.code})`
      : `Help pick where we eat! Open Forkcast, tap “Join a group” and enter ${group.code}`;
    try {
      await Share.share({ message });
    } catch {
      setShared(message);
    }
  }

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const diets = [...new Set(members.flatMap((m) => m.diets))];
      const res = await runSearch(group.settings, diets);
      const deck = buildDeck(res.places);
      if (!deck.length) throw new Error("No places suit everyone's dietary needs with these filters. Start a new group with a wider search.");
      await startGroup(group.code, deck, group.settings.minutes || 3);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 6, padding: 18, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
        <Label>Group code</Label>
        <Text selectable style={{ color: c.ink, fontSize: 52, fontWeight: "800", letterSpacing: 10 }}>{group.code}</Text>
        <Button title="Invite friends" kind="secondary" onPress={share} />
      </View>
      {shared ? <Notice text={`Copy this and send it: ${shared}`} /> : null}
      <Body muted>{summary}</Body>
      <Label>In the group ({members.length})</Label>
      <View style={{ gap: 8 }}>
        {members.map((m) => <Person key={m.user_id} m={m} me={me} host={group.host_id} />)}
      </View>
      {error ? <Notice tone="error" text={error} /> : null}
      {isHost ? (
        <Button title={members.length < 2 ? "Start anyway (just you so far)" : `Start swiping (${members.length} people)`} onPress={start} loading={busy} />
      ) : (
        <Body muted>Waiting for {hostName} to start…</Body>
      )}
      <Button
        title="Leave group"
        kind="ghost"
        onPress={() => { leaveGroup(group.code).finally(goHome); }}
      />
    </Screen>
  );
}

function Waiting({ members, me, isHost, onEnd }: { members: MemberRow[]; me: string | null; isHost: boolean; onEnd: () => void }) {
  const c = useColors();
  const done = members.filter((m) => m.done).length;
  return (
    <Screen>
      <Title>Done. Waiting for the others.</Title>
      <Body muted>{done} of {members.length} finished</Body>
      <View style={{ gap: 8 }}>
        {members.map((m) => (
          <View key={m.user_id} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.done ? c.yes : c.line }} />
            <Text style={{ color: c.ink, fontWeight: "600", flex: 1 }} numberOfLines={1}>{m.name}{m.user_id === me ? " (you)" : ""}</Text>
            <Text style={{ color: c.muted }}>{m.done ? "Done" : "Swiping…"}</Text>
          </View>
        ))}
      </View>
      {isHost ? <Button title="End voting now" kind="secondary" onPress={onEnd} /> : null}
    </Screen>
  );
}
