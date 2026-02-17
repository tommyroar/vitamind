# Deployment Tasks for Vitamind SPA and Documentation

**CRITICAL: All future deployments must follow the strategy outlined in [DEPLOY.md](./DEPLOY.md) and the issue handling protocol in [ISSUES.md](./ISSUES.md).**

## Overview

The deployment has three tracks:
1.  **Staging Preview**: Deploys automatically on any **Pull Request** targeting `main`. Used for pre-merge verification.
2.  **Vitamind SPA (Production)**: Deploys automatically on **merge to `main`**.
3.  **Documentation**: Must be manually triggered via `.github/workflows/deploy-docs.yaml`.

## MacOS Environment Note
Always ensure `.DS_Store` files are ignored globally and within the project `.gitignore`. These files frequently cause merge conflicts and dirty Git states on macOS environments. If found in a `git status`, they must be removed from the index and ignored before proceeding.

## Gemini Task Protocol

When performing development or deployment-related tasks:

1.  **Reference DEPLOY.md & ISSUES.md**: Always read [DEPLOY.md](./DEPLOY.md) and [ISSUES.md](./ISSUES.md) to ensure compliance with the project's staging-first deployment strategy and lifecycle management.
2.  **Verify Domain Coexistence**: Ensure that any changes to workflows maintain the `keep_files: true` configuration to prevent the SPA from overwriting the Docs (or vice-versa).
3.  **PR Feedback Loop**: The Gemini CLI is configured to respond to `@gemini-cli` commands in standard comments, PR reviews, and individual code line comments. Monitor all three for feedback.

## Automated Deployment Monitoring (Staging & Production)

1.  **Staging**: After merging a feature into `staging`, monitor the `deploy-staging.yaml` workflow and verify the fix at `https://tommyroar.github.io/vitamind/staging/`.
2.  **Production**: After merging into `main`, monitor the `deploy-spa.yaml` workflow and verify the live site at `https://tommyroar.github.io/vitamind/`.

## Manual Documentation Deployment

When documentation is updated, Gemini CLI should:
1.  Manually trigger the documentation workflow: `gh workflow run deploy-docs.yaml`.
2.  Monitor the run for `deploy-docs.yaml`.
3.  Verify the docs are live at `https://tommyroar.github.io/vitamind/docs/`.
