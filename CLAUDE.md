# Claude Context for Vitamind

**CRITICAL: All deployments must follow [DEPLOY.md](./DEPLOY.md) and the issue protocol in [ISSUES.md](./ISSUES.md).**

## Deployment Overview

A single workflow (`deploy.yaml`) handles all deployments via **manual trigger** (`workflow_dispatch`).
Every invocation builds and deploys all three targets in one push to `gh-pages`:

1. **Production SPA** → `https://tommyroar.github.io/vitamind/`
2. **Staging SPA** → `https://tommyroar.github.io/vitamind/staging/`
3. **Documentation (MkDocs)** → `https://tommyroar.github.io/vitamind/docs/`

To trigger a deployment: `gh workflow run deploy.yaml`

## Development Protocol

When performing development or deployment tasks:

1. **Read DEPLOY.md & ISSUES.md first**: Always reference these files to ensure compliance with the project's deployment strategy.
2. **Branch isolation**: Develop on a descriptive feature branch. Never commit directly to `main`.
3. **Never merge your own PRs**: Open a PR targeting `main` and wait for a human maintainer to merge.

## Issue Lifecycle

### Phase 1: Exploration
- Use Grep/Glob to locate relevant components, logic, and tests before proposing changes.
- Identify test and lint commands (e.g., `npm test`, `npm run lint`).

### Phase 2: Implementation & Verification
1. Implement on a feature branch.
2. Run unit tests, linting, and smoke tests locally.
3. Fix any failures before opening a PR.

### Phase 3: Pull Request
1. Open a PR to `main`, linked to the issue (e.g., "Fixes #123").
2. Respond to review feedback with new commits on the same branch. Do NOT merge.

### Phase 4: Deployment & Closure
1. After the human merges to `main`, trigger the deployment: `gh workflow run deploy.yaml`.
2. Verify the fix at `https://tommyroar.github.io/vitamind/`.
3. Only close the issue after confirming the production deployment succeeded.
