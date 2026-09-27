# AIS Alumni (同窓会)

Alumni association web app for Aichi International School — https://ais.kai-lab.net

Next.js 16 (App Router) · Auth.js v5 · Prisma 7 + PostgreSQL · next-intl (ja/en) · Tailwind 4 · Resend · LINE Login + Messaging API · Vercel Blob (private) · Vercel Cron.

## Local development

```bash
pnpm install                     # also runs `prisma generate`
docker run -d --name ais-alumni-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ais_alumni -p 54329:5432 postgres:17-alpine
cp .env.example .env             # set DATABASE_URL + AUTH_SECRET at minimum
pnpm db:migrate                  # apply migrations
SEED_ADMIN_EMAIL=you@example.com SEED_DEMO=1 pnpm db:seed
pnpm dev
```

Without `RESEND_API_KEY`, emails (including sign-in codes) are printed to the
server console and written to `.data/dev-mail/<address>.txt`. Without
`LINE_MESSAGING_CHANNEL_ID` + `LINE_MESSAGING_CHANNEL_SECRET`, LINE pushes are logged. Without
`BLOB_READ_WRITE_TOKEN`, uploads go to `.data/uploads/`.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (unit), `pnpm build && pnpm test:e2e` (Playwright smoke tests).

## Branches & environments

| Branch | Deploys to | Who merges |
|---|---|---|
| `main` | https://ais.kai-lab.net (production) | maintainer, via the auto-created "Release: dev → main" PR |
| `dev` | https://ais-dev.kai-lab.net | via PR from a feature branch (CI must pass) |

GitHub rulesets require PRs on both branches, and `main` only accepts PRs from `dev`, merged with a merge commit (not squash).

URLs: `/<locale>` is the public landing page; the app (sign-in, onboarding, member and admin screens) is under `/<locale>/app`.
Feature branches are not deployed. `dev` currently shares the production database.

## Deploying to Vercel (everything in Tokyo)

| Service | Region |
|---|---|
| Vercel Functions | `hnd1` (Tokyo) — pinned in `vercel.ts` |
| Supabase Postgres | Northeast Asia (Tokyo), `ap-northeast-1` |
| Vercel Blob | Tokyo (`hnd1`) |
| Resend | Tokyo (`ap-northeast-1`), chosen when adding the domain |

1. **Database** — create a Supabase project in *Northeast Asia (Tokyo)*. Set
   `DATABASE_URL` to the Supavisor **transaction** pooler (port 6543) and
   `DIRECT_URL` to the **session** pooler / direct connection (port 5432, used by migrations).
2. **Project** — import the repo in Vercel. `vercel.ts` pins functions to
   `hnd1` (Tokyo), runs `prisma migrate deploy` before `next build`, and registers the crons.
3. **Domain** — add `ais.kai-lab.net` in Project → Domains and create the DNS
   record Vercel shows (CNAME `ais` → `cname.vercel-dns.com` at kai-lab.net's DNS).
4. **Blob** — create a *private* Blob store in region Tokyo (`hnd1`) and connect it to the project (`BLOB_READ_WRITE_TOKEN`).
5. **Environment variables** — everything in `.env.example`. Generate `AUTH_SECRET` and `CRON_SECRET` with `openssl rand -base64 32`.
6. **Resend** — sending domain `ais.kai-lab.net` (region **Tokyo, ap-northeast-1**); `EMAIL_FROM` is `AIS Alumni <noreply@ais.kai-lab.net>`.
7. **Google OAuth** — authorized redirect URI `https://ais.kai-lab.net/api/auth/callback/google`.
8. **LINE** — under ONE LINE provider (so user IDs match, §5.1):
   - *LINE Login channel*: callback URLs `https://ais.kai-lab.net/api/auth/callback/line`
     and `https://ais.kai-lab.net/api/line/link/callback`; link the "AIS Alumni Committee"
     Official Account as the channel's bot (enables the add-friend prompt).
   - *Messaging API channel* (the Official Account): webhook URL
     `https://ais.kai-lab.net/api/line/webhook`, enable "Use webhook", disable auto-reply messages.
9. After the first deploy, bootstrap an admin:
   `DATABASE_URL=<prod pooled url> SEED_ADMIN_EMAIL=you@example.com pnpm db:seed`.

### Crons (UTC schedules in `vercel.ts`)

| Path | When (JST) | Purpose |
|---|---|---|
| `/api/cron/reminders` | daily 09:00 | 7-day / 1-day event reminders; scheduled news notifications |
| `/api/cron/stage-prompt` | April 1, 09:00 | yearly "is your status still …?" prompt |
| `/api/cron/cleanup-evidence` | daily 03:00 | delete proof uploads 30 days after decision |

## Assumptions for the spec's open questions

1. **Roster** — none for v1; roster import and matching exist, and the score is shown only when rows exist.
2. **Admins** — staff and committee volunteers share one `isAdmin` flag.
3. **Translation** — manual ja/en entry.
4. **LINE budget** — free tier; admins see an estimated push count before news goes out, and LINE sends are batched as multicasts.
5. **Minors** — current students can have accounts; admin approval (optionally backed by a parent's confirmed family link) activates them.
6. **Official Account** — operated by the committee; credentials go in env vars.

Other deviations from the spec sketch are commented in `prisma/schema.prisma`. For example, `primaryEmail` is nullable until a LINE-first user confirms an email, and the schema adds `OtpCode`, `UserMerge`, and `AuditLog` tables.

## Layout

- `src/lib/authz/` — `canViewPrivate` and the other access rules (pure core, unit-tested) plus `getProfileForViewer`, the only projection used to display another member's data.
- `src/lib/state-machine.ts` — account states and the screen each state lands on.
- `src/lib/notify/` — LINE-vs-email routing (§11), batching, and the notification log.
- `src/lib/session.ts` — page guards (`requireActive`, `requireAdmin`, …) and server-action guards (`actionActive`, `actionAdmin`, …).
- `messages/<locale>/<namespace>.json` — all UI strings.
