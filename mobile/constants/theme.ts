/** EliteTee portal light theme — mirrors web `et-theme-portal` tokens */
export const colors = {
  bgBase: "#f4f1ea",
  bgElevated: "#f0ece4",
  bgSurface: "#fbfaf7",
  bgSurfaceHover: "#f5f2eb",
  bgInset: "#ece7de",
  chromeBg: "#1c2b24",
  chromeBgElevated: "#243830",
  chromeText: "#f4f1ea",
  chromeMuted: "rgba(244, 241, 234, 0.58)",
  chromeBorder: "rgba(244, 241, 234, 0.1)",
  chromeAccent: "#a58a55",
  textPrimary: "#1c211d",
  textSecondary: "#6e716b",
  textTertiary: "#94978f",
  textDisabled: "#b5b8b0",
  textInverse: "#f4f1ea",
  forest: "#244a3a",
  forestHover: "#2d5a48",
  forestCta: "#1f4a39",
  forestSoft: "rgba(36, 74, 58, 0.1)",
  forestBorder: "rgba(36, 74, 58, 0.28)",
  gold: "#a58a55",
  goldHover: "#8f7548",
  goldSoft: "rgba(165, 138, 85, 0.12)",
  goldSofter: "rgba(165, 138, 85, 0.07)",
  ivory: "#f4f1ea",
  borderHairline: "rgba(40, 46, 40, 0.12)",
  borderSubtle: "rgba(40, 46, 40, 0.16)",
  borderAccent: "rgba(165, 138, 85, 0.32)",
  error: "#9e5050",
  errorSoft: "rgba(158, 80, 80, 0.1)",
  success: "#4a6b58",
  shadowSm: "rgba(28, 33, 29, 0.06)",
  shadowMd: "rgba(28, 33, 29, 0.1)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 9999,
} as const;

export const typography = {
  serif: "Newsreader_400Regular",
  serifSemibold: "Newsreader_600SemiBold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemibold: "Inter_600SemiBold",
  h1: 30,
  h2: 24,
  h3: 20,
  body: 15,
  bodySm: 14,
  caption: 11,
  label: 12,
} as const;

export const layout = {
  tabBarHeight: 60,
  buttonMinHeight: 48,
  inputMinHeight: 48,
  pagePadding: spacing.lg,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  layout,
} as const;

export type Theme = typeof theme;
