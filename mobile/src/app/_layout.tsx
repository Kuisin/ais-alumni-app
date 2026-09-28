import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { stackScreenOptions } from "@/lib/navigation";
import { queryClient } from "@/lib/query";
import { RealtimeProvider } from "@/lib/realtime";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Which part of the app is reachable follows the account (src/lib/auth.tsx):
 * signed out → sign-in; not yet approved → onboarding (website screens in
 * the web view); ACTIVE members → everything under (member).
 */
function Root() {
  const { status, me, locale } = useAuth();
  const signedIn = status === "signedIn";
  const active = signedIn && me?.user.state === "ACTIVE";

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  return (
    <I18nProvider locale={locale}>
      <RealtimeProvider config={active ? (me?.realtime ?? null) : null}>
        <StatusBar style="dark" />
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Protected guard={status === "signedOut"}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={status === "unreachable"}>
            <Stack.Screen name="offline" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !active}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={active}>
            <Stack.Screen name="(member)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen
              name="web"
              options={{ presentation: "fullScreenModal" }}
            />
          </Stack.Protected>
        </Stack>
      </RealtimeProvider>
    </I18nProvider>
  );
}
