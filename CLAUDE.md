# Claude Context for Vitamind

**CRITICAL: All deployments must follow [DEPLOY.md](./DEPLOY.md) and the issue protocol in [ISSUES.md](./ISSUES.md).**

## Deployment Overview

Three deployment tracks exist:
1. **Staging Preview**: Auto-deploys on any Pull Request targeting `main`. Verify at `https://tommyroar.github.io/vitamind/staging/`.
2. **Production SPA**: Auto-deploys on merge to `main`. Verify at `https://tommyroar.github.io/vitamind/`.
3. **Documentation**: Manual trigger only via `gh workflow run deploy-docs.yaml`. Verify at `https://tommyroar.github.io/vitamind/docs/`.

## Development Protocol

When performing development or deployment tasks:

1. **Read DEPLOY.md & ISSUES.md first**: Always reference these files to ensure compliance with the staging-first strategy.
2. **Branch isolation**: Develop on a descriptive feature branch. Never commit directly to `main`.
3. **Verify domain coexistence**: All workflow changes must preserve `keep_files: true` to prevent the SPA, staging, and Docs directories from overwriting each other on `gh-pages`.
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
1. Open a PR to `main`, linked to the issue (e.g., "Fixes #123").
2. `deploy-staging.yaml` triggers automatically — post the staging URL in a PR comment.
3. Respond to review feedback with new commits on the same branch. Do NOT merge.

### Phase 4: Deployment & Closure
1. After the human merges to `main`, monitor `deploy-spa.yaml`.
2. Verify the fix at `https://tommyroar.github.io/vitamind/`.
3. Only close the issue after confirming the production deployment succeeded.
