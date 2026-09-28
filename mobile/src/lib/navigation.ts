import { colors, font } from "@/ui/theme";

/** Shared header look for every stack. */
export const stackScreenOptions = {
  headerTintColor: colors.brand700,
  headerTitleStyle: { color: colors.text, fontWeight: font.weight.semibold },
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: true,
  contentStyle: { backgroundColor: colors.background },
} as const;
