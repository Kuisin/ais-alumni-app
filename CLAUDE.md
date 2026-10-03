@AGENTS.md

# Git workflow (repo rules)

- `main` = production (ais.kai-lab.net). `dev` = staging (ais-dev.kai-lab.net).
- Agents/LLMs work on feature branches and open PRs **into `dev` only**. An agent may merge its own PR into `dev` once CI passes.
- **Never merge into `main`, never open PRs into `main`, never push to `dev`/`main` directly.** The maintainer merges `dev` → `main` via the auto-created "Release: dev → main" PR.
- Rulesets on GitHub require PRs on both branches; `main` only accepts PRs from `dev` (Branch policy check).
- Release PRs (`dev` → `main`) must use a **merge commit** (enforced on `main`). A squash merge would leave `main` with a commit `dev` lacks and make every later release PR conflict. Feature PRs into `dev` may be squashed.

# URL layout

- `/<locale>` — public landing page; `/<locale>/privacy` — privacy notice.
- `/<locale>/app` — sign-in; everything else (onboarding, member, admin) is under `/<locale>/app/...` (`src/app/[locale]/app/`).

# Database schema (owned by Kuisin/ais-alumni-v2)

- The schema and its migrations moved to [Kuisin/ais-alumni-v2](https://github.com/Kuisin/ais-alumni-v2) (`prisma/schema.prisma`, `prisma/migrations`); its Vercel build applies them. **This repo no longer migrates**: `vercel.ts` builds with `prisma generate && next build`, and no new migration is written here first.
- This site still reads the same Supabase database, so a schema change is made in v2, then copied here: `prisma/schema.prisma` (keep this repo's `output = "../src/generated/prisma"`) and the migration folder under the **same name** as in v2, byte for byte — only so local and e2e databases (`npx prisma migrate deploy`) get the tables. Production already has it recorded as applied.
- `prisma migrate dev` does not work here (its shadow database can't replay the RLS migration, which touches `_prisma_migrations`).
- `dev` and `main` of both repos **share the production Supabase DB**, so every migration must be backward-compatible with the code on both `main` branches (expand → migrate → contract): new tables, nullable columns, columns with defaults and indexes in one step; renames, drops, NOT NULL and type changes split across releases.
- New tables need `ALTER TABLE "<Name>" ENABLE ROW LEVEL SECURITY;` (blocks Supabase's public Data API) — in the v2 migration that creates them.
- Check prod status with `prisma migrate status` from v2, using the direct URL from the local gitignored `.env.supabase`.
