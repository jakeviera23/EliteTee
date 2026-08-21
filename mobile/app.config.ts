import type { ConfigContext, ExpoConfig } from "expo/config";

const IVORY = "#f4f1ea";
const FOREST = "#244a3a";

const PLACEHOLDER_VALUES = new Set([
  "undefined",
  "null",
  "your_supabase_url",
  "your-project.supabase.co",
  "your_anon_key",
  "your_supabase_anon_key",
]);

function normalizeEnv(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidSupabaseUrl(url: string): boolean {
  if (!url || PLACEHOLDER_VALUES.has(url.toLowerCase())) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidAnonKey(key: string): boolean {
  if (!key || PLACEHOLDER_VALUES.has(key.toLowerCase())) return false;
  return key.length >= 20;
}

/** Fail EAS builds early when public Supabase env is missing (no secrets written to git). */
function assertEasPreviewEnv() {
  const isEasBuild = process.env.EAS_BUILD === "true";
  if (!isEasBuild) return;

  const url = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (!isValidSupabaseUrl(url) || !isValidAnonKey(anonKey)) {
    throw new Error(
      [
        "EAS build is missing required public Supabase env.",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in EAS secrets/env for this profile.",
        "Run: npm run check:preview-env",
      ].join(" "),
    );
  }
}

assertEasPreviewEnv();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "EliteTee",
  owner: "elitetee",
  slug: "elitetee",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "elitetee",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: IVORY,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "club.elitetee.mobile",
    buildNumber: "1",
    infoPlist: {
      CFBundleDisplayName: "EliteTee",
      NSPhotoLibraryUsageDescription:
        "EliteTee uses your photo library so you can attach round photos to member posts.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#181715",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    package: "club.elitetee.mobile",
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-splash-screen",
    [
      "expo-image-picker",
      {
        photosPermission:
          "EliteTee uses your photo library so you can attach round photos to member posts.",
      },
    ],
  ],
  extra: {
    ...config.extra,
    eas: {
      projectId: "497694bf-fdcb-46fe-b6b6-63932ce5b394",
    },
    brandColorForest: FOREST,
    brandColorIvory: IVORY,
  },
});
