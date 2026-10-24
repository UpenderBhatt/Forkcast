import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Body, Choice, Screen, Title } from "@/components/ui";
import { useColors } from "@/lib/theme";

export default function GroupChoice() {
  const c = useColors();
  return (
    <Screen>
      <Title>How is your group voting?</Title>
      <Choice title="Everyone on their own phone" sub="Share a link or code. Everyone swipes at once, with a timer." onPress={() => router.push("/search?mode=host")} />
      <Choice title="Pass one phone around" sub="Everyone takes a turn swiping in private." onPress={() => router.push("/group/names")} />
      <Pressable accessibilityRole="link" onPress={() => router.push("/join")} hitSlop={8}>
        <Text style={{ color: c.accent, fontWeight: "700", fontSize: 16 }}>Got a group code? Join a group</Text>
      </Pressable>
      <Body muted style={{ fontSize: 14 }}>Friends don't need an account. They just need the link or the 4-letter code.</Body>
    </Screen>
  );
}
