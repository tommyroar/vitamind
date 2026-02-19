# Claude Context for Vitamind

**CRITICAL: All deployments must follow [DEPLOY.md](./DEPLOY.md) and the issue protocol in [ISSUES.md](./ISSUES.md).**

## Deployment Overview

Two deployment workflows exist:

1. **Staging Preview** (`deploy-staging.yaml`): Auto-deploys on any Pull Request targeting `main`. After deploy, posts a PR comment with the staging URL. Verify at `https://tommyroar.github.io/vitamind/staging/`.
2. **Production** (`deploy-spa.yaml`): Auto-deploys on merge to `main`. Verify at `https://tommyroar.github.io/vitamind/`.

Docs are maintained directly in the [GitHub Wiki](https://github.com/tommyroar/vitamind/wiki). Use the `/wiki` slash command to push updates.

## Development Protocol

When performing development or deployment tasks:

1. **Read DEPLOY.md & ISSUES.md first**: Always reference these files to ensure compliance with the project's deployment strategy.
2. **Branch isolation**: Develop on a descriptive feature branch. Never commit directly to `main`.
3. **Verify domain coexistence**: All workflow changes must preserve `keep_files: true` to prevent the production root and `staging/` directory from overwriting each other on `gh-pages`.
4. **Never merge your own PRs**: Open a PR targeting `main` and wait for a human maintainer to merge.

## Issue Lifecycle

### Phase 1: Exploration
- Use Grep/Glob to locate relevant components, logic, and tests before proposing changes.
- Identify test and lint commands (e.g., `npm test`, `npm run lint`).

### Phase 2: Implementation & Verification
1. Implement on a feature branch.
2. Run unit tests, linting, and smoke tests locally.
3. Fix any failures before opening a PR.

### Phase 3: Pull Request & Staging
1. Open a PR to `main`, using `Fixes #N` or `Closes #N` keywords in the PR body so GitHub auto-closes the issue on merge (e.g., "Fixes #123").
2. `deploy-staging.yaml` triggers automatically and posts a comment on the PR with the staging URL.
3. Respond to review feedback with new commits on the same branch. Do NOT merge.

### Phase 4: Deployment & Closure
1. After the human merges to `main`, `deploy-spa.yaml` triggers automatically.
2. Verify the fix at `https://tommyroar.github.io/vitamind/`.
3. Only close the issue after confirming the production deployment succeeded.
