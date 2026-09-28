import type { Href } from "expo-router";

/**
 * Website paths ↔ app screens. Pages the app has natively open natively —
 * from links in news posts, from the web view, from notifications — and
 * everything else opens in the web view (src/app/web.tsx), signed in.
 *
 * Keep NATIVE in step with the routes under src/app/(member).
 */

type Rule = [RegExp, (m: RegExpExecArray) => string];

const ID = "([A-Za-z0-9_-]{1,64})";

const RULES: Rule[] = [
  [/^\/app\/dashboard$/, () => "/home"],
  [/^\/app\/directory$/, () => "/directory"],
  [/^\/app\/members\/ID$/, (m) => `/members/${m[1]}`],
  [/^\/app\/events$/, () => "/events"],
  [/^\/app\/events\/(?!new$)ID$/, (m) => `/events/${m[1]}`],
  [/^\/app\/news$/, () => "/news"],
  [/^\/app\/news\/(?!new$|messages$)ID$/, (m) => `/news/${m[1]}`],
  [/^\/app\/chat$/, () => "/chat"],
  [/^\/app\/chat\/(?!new$)ID$/, (m) => `/chat/${m[1]}`],
  [/^\/app\/chat\/ID\/info$/, (m) => `/chat/${m[1]}/info`],
  [/^\/app\/profile$/, () => "/me"],
  [/^\/app\/follows$/, () => "/follows"],
  [/^\/app\/settings$/, () => "/settings"],
];

const NATIVE: Rule[] = RULES.map(([re, to]) => [
  new RegExp(re.source.replaceAll("ID", ID)),
  to,
]);

/** "/ja/app/news/abc?x" → "/app/news/abc" (null for other sites). */
export function sitePath(urlOrPath: string, origin?: string): string | null {
  let path = urlOrPath;
  if (/^[a-z][a-z0-9+.-]*:/i.test(urlOrPath)) {
    try {
      const u = new URL(urlOrPath);
      if (!origin || u.origin !== new URL(origin).origin) return null;
      path = u.pathname;
    } catch {
      return null;
    }
  }
  path = path.split(/[?#]/)[0] ?? "";
  return path.replace(/^\/(ja|en)(?=\/|$)/, "").replace(/\/+$/, "") || "/";
}

/** The native screen for a website path, or null if the app has none. */
export function nativeHref(path: string): Href | null {
  for (const [re, to] of NATIVE) {
    const m = re.exec(path);
    if (m) return to(m) as Href;
  }
  return null;
}

/** Open a website page in the app's web view (signed in). */
export function webHref(path: string, title?: string): Href {
  return {
    pathname: "/web",
    params: title ? { path, title } : { path },
  } as Href;
}

/** Native screen if there is one, else the web view. */
export function hrefFor(path: string, title?: string): Href {
  return nativeHref(sitePath(path) ?? path) ?? webHref(path, title);
}
