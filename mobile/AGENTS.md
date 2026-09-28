# AIS Alumni — native app (Expo)

The iOS / Android app for the website at the repository root. The website
stays the backend: the app talks to its JSON API under `/api/mobile/v1`
(route handlers in `../src/app/api/mobile/v1`, helpers in `../src/lib/mobile`)
and shows website screens it doesn't have natively in a signed-in web view.

## Expo has changed — do not trust your training data

This is Expo SDK 57 (React Native 0.86, React 19.2, Expo Router 57). APIs
you remember may be renamed, moved or removed. Before using an Expo, EAS or
React Native API, fetch the docs: https://docs.expo.dev/llms.txt (index;
append `.md` to any docs URL). Router notes that matter here:

- Import navigation from `expo-router` (`expo-router/react-navigation` for
  React Navigation APIs) — never from `@react-navigation/*`.
- Use `useRouter()` and complete hrefs; no `initialRouteName` (use
  `unstable_settings.anchor`); declare every tab in the tabs layout.
- Install packages with `pnpm expo install <pkg>` (SDK-compatible versions).
  Prefer packages available in Expo Go.

## Commands (run in `mobile/`)

```bash
pnpm install
pnpm start                 # Metro for Expo Go (`expo start --go`)
pnpm start:dev-client      # Metro for a development build (eas.json "development")
pnpm ios                   # Expo Go in the iOS Simulator (needs Xcode)
pnpm typecheck             # tsc --noEmit
pnpm lint                  # Biome (the repo's biome.json)
npx expo export --platform ios --output-dir /tmp/x   # bundle check
pnpm icons                 # regenerate app + website icons from the logo
```

`expo-dev-client` is installed (for development builds), so a bare
`expo start` serves a development-build bundle — Expo Go then fails with
"Cannot find native module …". Use `pnpm start` (`--go`) for Expo Go.

Point the app at a server with `EXPO_PUBLIC_API_URL` (default: production).
For a local website: `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000 pnpm start`.

## How it fits together

- **Sign-in** (`src/lib/auth.tsx`, `src/app/sign-in.tsx`): email code
  (`/auth/email/request` → `/auth/email/verify`), or Google / LINE through
  the system browser with PKCE (`/auth/oauth/start` → Auth.js → `/finish` →
  `aisalumni://auth?code=…` → `/auth/oauth/exchange`). The result is a
  bearer token (keychain, `expo-secure-store`); the server stores only its
  hash (`MobileSession`). `getCurrentUser()` on the server accepts it, so all
  existing authorization code applies unchanged.
- **Account state** (`GET /me`): not-yet-approved accounts see
  `src/app/onboarding.tsx`, which opens the website's onboarding screens in
  the web view; ACTIVE members get the tabs under `src/app/(member)`.
- **Web view** (`src/app/web.tsx`, `/web?path=/app/…`): loads
  `/api/mobile/v1/web?next=…` with the bearer token, which sets a normal
  website session cookie (private cookie jar) and the `ais_app` embed
  cookie, so the site hides its own navigation. Links to pages the app has
  natively leave the web view (`src/lib/links.ts`).
- **Realtime** (`src/lib/realtime.tsx`): the website's signal-only Supabase
  Broadcast channels; topics come from `/me` (and room responses).
- **Strings** (`src/lib/i18n.tsx`): the website's `../messages/<locale>/*.json`
  through use-intl (next-intl's core), so both say the same thing. App-only
  strings: `../messages/<locale>/mobile.json`.

## Conventions

**Server (in the repo root)**

- One route file per endpoint: `src/app/api/mobile/v1/<feature>/…/route.ts`,
  wrapped in `mobileRoute()` (`src/lib/mobile/http.ts`) — it resolves the
  member, requires ACTIVE by default, and maps errors to `{ error: code }`.
  Throw `ApiError(status, code)` / `notFound()` / `invalid()`; parse bodies
  with `readJson(request, zodSchema)`.
- Loaders and mutations in `src/lib/mobile/<feature>.ts`. Reuse the website's
  lib code for every access and visibility rule (`src/lib/authz`,
  `news-visibility`, `photoFor`, the server actions' checks…) — never write a
  second version of a rule. Calling a server action from a route is fine
  (it sees the bearer session); build its `FormData` / arguments as the form
  would.
- Response types in `src/lib/mobile/contract/<feature>.ts`: pure types, no
  imports (the app imports them type-only as `@contract/<feature>`). Change
  them additively — installed apps update slowly.
- Server-composed text (sender labels, localized titles) uses the member's
  locale (`ctx.locale`). The app sends `X-NEXT-INTL-LOCALE`, so implicit
  `getTranslations()` calls match too.

**App**

- Screens: tabs in `src/app/(member)/(tabs)/<tab>.tsx`; pushed screens in
  `src/app/(member)/<feature>/…`. Set titles with
  `<Stack.Screen options={{ title }} />`. Keep `src/lib/links.ts` in step.
- Feature code in `src/features/<feature>/` (components, `api.ts` hooks).
  Shared primitives in `src/ui` (`Text`, `Button`, `Card`, `ListRow`,
  `Screen`, `QueryState`, `Markdown`, …) — use them; always `Text` from
  `@/ui`, theme tokens instead of literal colors, 44 pt touch targets,
  accessibility roles and labels. Icons: `lucide-react-native` (same set as
  the website).
- Data: TanStack Query. Keys start with the feature: `["news", …]`,
  `["events", …]`, `["chat", "list"]`, `["chat", "room", id]`,
  `["directory", …]`, `["members", id]`, `["follows"]`, `["home"]`,
  `["settings"]`; `ME_KEY` (`["me"]`) holds the account and badges —
  invalidate it after anything that changes a badge.
- Dates: `formatDateTime` / `formatDate` from `@/lib/format` (Japan time,
  like the website).
- Website-only screens: `router.push(webHref("/app/…"))`; website paths in
  general: `hrefFor(path)` (native screen if there is one).

## Testing locally (no simulator needed)

1. Website: `pnpm dev -p 3187` at the repo root with a local database.
2. App (web build, for screenshots): `EXPO_PUBLIC_API_URL=http://localhost:3187 npx expo start --web --port 8087`.
3. A session token for a local member: `pnpm exec tsx --env-file=.env scripts/mobile-dev-token.ts hanako@example.com` (repo root; refuses non-local databases) — for `curl -H "Authorization: Bearer …" localhost:3187/api/mobile/v1/me`.
4. Screenshot a screen signed in: `node mobile/scripts/preview.mjs --email hanako@example.com --path /news --out /tmp/news.png` (`--click`, `--fill "selector=>value"`, `--full`, `--signed-out`).

The web build can't show web views (native only) and runs with web
security off; check native-only behavior (web view, sign-in with LINE /
Google, keychain) in Expo Go or a development build.

## Builds and release (EAS)

`eas.json` has `development` (dev client, ais-dev), `preview` (internal,
ais-dev) and `production` (ais.kai-lab.net) profiles. First time:
`npx eas-cli@latest init` (adds the project id), then
`npx eas-cli@latest build --profile preview --platform all`.
Google / LINE sign-in need the `aisalumni://` scheme, so they work in
development / preview / production builds, not in Expo Go against a
deployed server (Expo Go works with email codes, or with a local server).
