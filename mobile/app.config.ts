import type { ConfigContext, ExpoConfig } from "expo/config";

const IVORY = "#f4f1ea";
const FOREST = "#244a3a";

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
      NSPhotoLibraryAddUsageDescription:
        "EliteTee can save round photos you choose to share with the member network.",
      NSCameraUsageDescription:
        "EliteTee uses the camera so you can capture round photos for member posts.",
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
        cameraPermission:
          "EliteTee uses the camera so you can capture round photos for member posts.",
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
