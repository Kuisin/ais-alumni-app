import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import WebView, { type WebViewNavigation } from "react-native-webview";
import { useTranslations } from "use-intl";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { nativeHref, sitePath } from "@/lib/links";
import { Button, colors, Loading, space, Text } from "@/ui";

type Props = {
  /** website path, e.g. "/app/family" */
  path: string;
  onTitle: (title: string) => void;
};

/**
 * A website page, signed in: the first request goes to /api/mobile/v1/web
 * with the app's bearer token, which sets a session cookie in this web
 * view's private (incognito) cookie jar and redirects to the page. Links to
 * pages the app has natively leave the web view; other sites open in the
 * browser.
 */
export function WebPage({ path, onTitle }: Props) {
  const t = useTranslations("mobile.web");
  const router = useRouter();
  const { token, refreshMe } = useAuth();
  const ref = useRef<WebView>(null);
  const loaded = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      ref.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const leaveFor = (href: ReturnType<typeof nativeHref>) => {
    router.back();
    if (href) setTimeout(() => router.push(href), 0);
  };

  const shouldLoad = (req: WebViewNavigation & { isTopFrame?: boolean }) => {
    const { url } = req;
    if (!/^https?:/i.test(url)) {
      // mailto:, tel:, line: …
      void Linking.openURL(url).catch(() => {});
      return false;
    }
    const p = sitePath(url, API_URL);
    if (p === null) {
      if (req.isTopFrame === false) return true; // embeds
      void WebBrowser.openBrowserAsync(url);
      return false;
    }
    if (!loaded.current || req.isTopFrame === false) return true;
    if (p === "/" || p === "/app") {
      // Signed out on the website (or the session ended): back to the app.
      void refreshMe();
      leaveFor(null);
      return false;
    }
    const native = nativeHref(p);
    if (native) {
      leaveFor(native);
      return false;
    }
    return true;
  };

  if (!token) return null;
  if (failed)
    return (
      <View style={styles.center}>
        <Text tone="muted" center>
          {t("loadFailed")}
        </Text>
        <Button
          variant="secondary"
          label={t("reload")}
          onPress={() => {
            loaded.current = false;
            setFailed(false);
          }}
        />
      </View>
    );

  return (
    <WebView
      ref={ref}
      style={styles.web}
      source={{
        uri: `${API_URL}/api/mobile/v1/web?next=${encodeURIComponent(path)}`,
        headers: { Authorization: `Bearer ${token}` },
      }}
      incognito
      sharedCookiesEnabled={false}
      applicationNameForUserAgent="AISAlumniApp/1"
      allowsBackForwardNavigationGestures
      pullToRefreshEnabled
      startInLoadingState
      renderLoading={() => <Loading />}
      setSupportMultipleWindows
      onOpenWindow={(e) => {
        void WebBrowser.openBrowserAsync(e.nativeEvent.targetUrl);
      }}
      onShouldStartLoadWithRequest={shouldLoad}
      onNavigationStateChange={(nav) => {
        setCanGoBack(nav.canGoBack);
        if (nav.title && !/^https?:/.test(nav.title))
          onTitle(nav.title.replace(/\s*\|\s*AIS.*$/, ""));
      }}
      onLoadEnd={() => {
        loaded.current = true;
      }}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
    padding: space.xl,
  },
});
