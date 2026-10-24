import { useColorScheme } from "react-native";

const light = {
  bg: "#EDF1EB",
  surface: "#FFFFFF",
  sunk: "#E1E8DF",
  ink: "#17201B",
  muted: "#55625B",
  line: "#D0D9CD",
  accent: "#D3391E",
  accentInk: "#FFFFFF",
  yes: "#12784A",
  yesInk: "#FFFFFF",
  veto: "#6A35B0",
  star: "#A86A12",
  scrim: "rgba(12,16,14,0.55)",
};
const dark: typeof light = {
  bg: "#0F1412",
  surface: "#18201C",
  sunk: "#222B26",
  ink: "#E8EEE9",
  muted: "#9AA79F",
  line: "#2D3832",
  accent: "#FF6B4F",
  accentInk: "#1B0D09",
  yes: "#3BC988",
  yesInk: "#08170F",
  veto: "#B48FF2",
  star: "#F0B54A",
  scrim: "rgba(0,0,0,0.65)",
};
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

export const radius = 14;
export const space = 16;
