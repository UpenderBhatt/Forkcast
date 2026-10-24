import { Redirect, useLocalSearchParams } from "expo-router";
import { cleanCode } from "@/lib/groups";

/** Short share links: /j/ABCD opens the join screen with the code filled in. */
export default function ShortLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={`/join?code=${cleanCode(String(code ?? ""))}`} />;
}
