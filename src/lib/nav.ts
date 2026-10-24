import { router } from "expo-router";

/** Back to the home screen, clearing anything stacked on top. */
export function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.replace("/");
}
