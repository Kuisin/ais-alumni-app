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

# Database migrations (LLM-owned)

- The LLM writes migrations and ships them in the PR into `dev`. `prisma migrate dev` does not work here (its shadow database can't replay the RLS migration, which touches `_prisma_migrations`), so create them from a diff against the local Docker DB:
  ```bash
  mkdir prisma/migrations/<timestamp>_<name>
  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql
  npx prisma migrate deploy   # apply locally
  ```
- Vercel runs `prisma migrate deploy` on every `dev` and `main` build. `dev` **shares the production Supabase DB**, so a migration merged into `dev` hits production immediately, before `main` has the matching code.
- Therefore every migration must be **backward-compatible with the code on `main`** (expand → migrate → contract):
  - OK in one step: new tables, new nullable columns or columns with defaults, new indexes.
  - Split across releases: renames, drops, NOT NULL on existing columns, type changes (add new → backfill → switch code → release to main → drop old in a later PR).
- New tables must `ALTER TABLE "<Name>" ENABLE ROW LEVEL SECURITY;` in their migration (blocks Supabase's public Data API).
- Check prod status with `prisma migrate status` using the direct URL from the local gitignored `.env.supabase`.
