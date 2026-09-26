@AGENTS.md

# Git workflow (repo rules)

- `main` = production (ais.kai-lab.net). `dev` = staging (ais-dev.kai-lab.net).
- Agents/LLMs work on feature branches and open PRs **into `dev` only**. An agent may merge its own PR into `dev` once CI passes.
- **Never merge into `main`, never open PRs into `main`, never push to `dev`/`main` directly.** The maintainer merges `dev` → `main` via the auto-created "Release: dev → main" PR.
- Rulesets on GitHub require PRs on both branches; `main` only accepts PRs from `dev` (Branch policy check).
