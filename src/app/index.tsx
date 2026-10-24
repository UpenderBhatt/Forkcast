import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Body, Choice, Notice, Screen, Title } from "@/components/ui";
import { isConfigured, NOT_SET_UP } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

export default function Home() {
  const c = useColors();
  return (
    <Screen>
      <Title>Where are we eating tonight?</Title>
      <Body muted>
        Pick a budget and a cuisine to see independent places near you, or swipe and vote with friends until there's a winner.
      </Body>
      {!isConfigured ? <Notice tone="error" text={NOT_SET_UP} /> : null}
      <Choice title="Just me" sub="Search, browse photos and reviews" onPress={() => router.push("/search?mode=solo")} />
      <Choice title="With friends" sub="Swipe, veto, vote. Ties go to the wheel." onPress={() => router.push("/group")} />
      <Pressable accessibilityRole="link" onPress={() => router.push("/join")} hitSlop={8}>
        <Text style={{ color: c.accent, fontWeight: "700", fontSize: 16 }}>Got a group code? Join a group</Text>
      </Pressable>
      <Body muted style={{ fontSize: 14 }}>Chains are hidden by default, so independents get seen first.</Body>
    </Screen>
  );
}
