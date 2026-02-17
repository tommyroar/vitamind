# Deployment Strategy: Vitamind SPA & Documentation

This project uses a branch-based deployment strategy to GitHub Pages, allowing for production, staging, and documentation environments to coexist on the same domain.

## Infrastructure Overview

- **Deployment Branch**: `gh-pages`
- **Production URL (`/`)**: Serves the live Vitamind React SPA.
- **Staging URL (`/staging/`)**: Serves a testing version of the SPA.
- **Docs URL (`/docs/`)**: Serves the MkDocs technical documentation.
- **GitHub Pages Setting**: Must be set to **"Deploy from a branch"** targeting the `gh-pages` branch and `/ (root)` folder.

## Workflows & Environments

### 1. Staging Deployment (`deploy-staging.yaml`)
- **Trigger**: Automatic on every push to the `staging` branch.
- **Usage**: **All new features and PRs must be merged into `staging` first.** This allows for testing in a live-like environment before production.
- **Action**: Builds the SPA with base path `/vitamind/staging/` and deploys to the `staging/` directory on `gh-pages`.

### 2. Production SPA Deployment (`deploy-spa.yaml`)
- **Trigger**: Automatic on every push or merge to the `main` branch. 
- **Usage**: Merging the `staging` branch (or a verified PR) into `main` triggers the live site update.
- **Action**: Builds the React application and pushes the contents to the root of the `gh-pages` branch.

### 3. Documentation Deployment (`deploy-docs.yaml`)
- **Trigger**: **Manual only** via `workflow_dispatch`.
- **Action**: Builds the MkDocs site and pushes the output to the `docs/` directory on `gh-pages`.

## Coexistence Policy
All workflows MUST use `peaceiris/actions-gh-pages` with `keep_files: true` to ensure they do not overwrite each other's directories on the `gh-pages` branch.

## Security & Secrets

### Mapbox Public Token
The SPA requires a Mapbox public access token (`VITE_MAPBOX_ACCESS_TOKEN`). 
- Secured via **domain whitelisting** in Mapbox (restricted to `tommyroar.github.io/*`).
- GitHub Push Protection allows this secret. Unblock at: [GitHub Secret Scanning](https://github.com/tommyroar/vitamind/security/secret-scanning)

## Manual Deployment via CLI

```bash
# Deploy Staging
gh workflow run deploy-staging.yaml

# Deploy Production SPA
gh workflow run deploy-spa.yaml

# Deploy Documentation
gh workflow run deploy-docs.yaml
```
