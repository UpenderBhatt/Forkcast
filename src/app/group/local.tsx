import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Outcome } from "@/components/Outcome";
import { SwipeSession } from "@/components/SwipeSession";
import { Body, Button, Label, Screen } from "@/components/ui";
import { goHome } from "@/lib/nav";
import { computeResult, type Result } from "@/lib/results";
import { useApp, type Player } from "@/lib/store";
import { useColors } from "@/lib/theme";

/** Pass-the-phone: each person gets a private turn, then the result. */
export default function LocalGroup() {
  const c = useColors();
  const { players, localDeck, known } = useApp();
  const [votes, setVotes] = useState<Player[]>(() => players.map((p) => ({ ...p, swipes: "", veto: null })));
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<"handoff" | "swipe">("handoff");
  const [result, setResult] = useState<Result | null>(null);
  const deckIds = useMemo(() => localDeck.map((p) => p.id), [localDeck]);

  if (!localDeck.length || !votes.length) {
    return <Screen><Body muted>Start from “With friends” on the home screen.</Body></Screen>;
  }

  if (result) {
    return (
      <Screen>
        <Outcome result={result} places={known} kind="group" onStartOver={goHome} />
      </Screen>
    );
  }

  const who = votes[turn];

  if (phase === "handoff") {
    return (
      <Screen>
        <View style={{ alignItems: "center", gap: 16, paddingTop: 40 }}>
          <Label>Turn {turn + 1} of {votes.length}</Label>
          <Body muted>Pass the phone to</Body>
          <Text style={{ color: c.ink, fontSize: 52, fontWeight: "800", letterSpacing: -1.5, textAlign: "center" }}>{who.name}</Text>
          <Body muted style={{ textAlign: "center" }}>Keep your swipes to yourself. You get one veto.</Body>
          <Button title="I'm ready" onPress={() => setPhase("swipe")} style={{ alignSelf: "stretch" }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <SwipeSession
        key={turn}
        deck={localDeck}
        label={`${who.name}'s turn`}
        onFinish={(swipes, veto) => {
          const next = votes.map((v, i) => (i === turn ? { ...v, swipes, veto } : v));
          setVotes(next);
          if (turn + 1 < next.length) {
            setTurn(turn + 1);
            setPhase("handoff");
          } else {
            setResult(computeResult(deckIds, next));
          }
        }}
      />
    </Screen>
  );
}
