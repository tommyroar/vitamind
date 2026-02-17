# Deployment Strategy: Vitamind SPA & Documentation

This project uses a branch-based deployment strategy to GitHub Pages, using the `gh-pages` branch to host production, staging previews, and documentation.

## Infrastructure Overview

- **Deployment Branch**: `gh-pages`
- **Production URL (`/`)**: Serves the live Vitamind React SPA.
- **Staging URL (`/staging/`)**: Serves a live preview of the currently open Pull Request.
- **Docs URL (`/docs/`)**: Serves the MkDocs technical documentation.
- **GitHub Pages Setting**: Must be set to **"Deploy from a branch"** targeting the `gh-pages` branch and `/ (root)` folder.

## Workflows & Environments

### 1. Staging Preview (`deploy-staging.yaml`)
- **Trigger**: Automatic on every **Pull Request** targeting the `main` branch.
- **Usage**: Allows maintainers to verify PR changes in a live environment before merging. 
- **Action**: Builds the PR code with base path `/vitamind/staging/` and deploys to the `staging/` directory on `gh-pages`.

### 2. Production SPA Deployment (`deploy-spa.yaml`)
- **Trigger**: Automatic on every **push or merge** to the `main` branch. 
- **Usage**: Merging a reviewed PR into `main` triggers the live site update.
- **Action**: Builds the production application and pushes it to the root of the `gh-pages` branch.

### 3. Documentation Deployment (`deploy-docs.yaml`)
- **Trigger**: **Manual only** via `workflow_dispatch`.
- **Action**: Builds the MkDocs site and pushes it to the `docs/` directory on `gh-pages`.

## Coexistence Policy
All workflows MUST use `peaceiris/actions-gh-pages` with `keep_files: true` to ensure they do not overwrite each other's directories on the `gh-pages` branch. Merging must be performed by a human maintainer.

## Security & Secrets

### Mapbox Public Token
The SPA requires a Mapbox public access token (`VITE_MAPBOX_ACCESS_TOKEN`). 
- Secured via **domain whitelisting** in Mapbox (restricted to `tommyroar.github.io/*`).
- GitHub Push Protection allows this secret. Unblock at: [GitHub Secret Scanning](https://github.com/tommyroar/vitamind/security/secret-scanning)
