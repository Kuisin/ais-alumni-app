import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * AIS Alumni — the native app for the website at ais.kai-lab.net. The
 * server it talks to is EXPO_PUBLIC_API_URL (set per build profile in
 * eas.json; defaults to production in src/lib/config.ts).
 */
const IDENTIFIER = "net.kailab.aisalumni";
const BRAND = "#1e3a8a";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "AIS Alumni",
  slug: "ais-alumni",
  // Google / LINE sign-in returns to aisalumni://auth (src/lib/auth.tsx).
  scheme: "aisalumni",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: IDENTIFIER,
    supportsTablet: false,
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: false,
      // Photo uploads on website screens opened in the app (web view).
      NSCameraUsageDescription:
        "Used to take a photo when you upload a picture or a document.",
      NSPhotoLibraryUsageDescription:
        "Used to choose a picture or a document to upload.",
    },
    // "Required reason" APIs used by React Native and the Expo modules
    // (Apple rejects builds that don't declare them).
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
          NSPrivacyAccessedAPITypeReasons: ["0A2A.1", "3B52.1", "C617.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
          NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
        },
        {
          NSPrivacyAccessedAPIType:
            "NSPrivacyAccessedAPICategorySystemBootTime",
          NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
        },
      ],
    },
  },
  android: {
    package: IDENTIFIER,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/monochrome-icon.png",
      backgroundColor: BRAND,
    },
    predictiveBackGestureEnabled: false,
    // Web view: ticket scanning at check-in, and "take photo" on uploads.
    permissions: ["android.permission.CAMERA"],
  },
  locales: {
    ja: "./locales/ja.json",
    en: "./locales/en.json",
  },
  web: {
    // Web is only used for local testing of the screens.
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: BRAND,
        image: "./assets/images/splash-icon.png",
        imageWidth: 160,
      },
    ],
    "expo-secure-store",
    "expo-web-browser",
    "expo-localization",
    "expo-image",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
