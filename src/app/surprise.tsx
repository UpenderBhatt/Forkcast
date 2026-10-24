import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Outcome } from "@/components/Outcome";
import { Body, Screen } from "@/components/ui";
import { goHome } from "@/lib/nav";
import type { Result } from "@/lib/results";
import { useApp } from "@/lib/store";

export default function Surprise() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const known = useApp((s) => s.known);
  const [result] = useState<Result | null>(() => {
    const list = String(ids ?? "").split(",").filter((id) => known[id]).slice(0, 8);
    if (list.length < 2) return null;
    return { r: [], tie: list, w: list[Math.floor(Math.random() * list.length)], n: 0 };
  });
  if (!result) return <Screen><Body muted>Search for places first, then try Surprise me.</Body></Screen>;
  return (
    <Screen>
      <Outcome result={result} places={known} kind="solo" onStartOver={goHome} />
    </Screen>
  );
}
