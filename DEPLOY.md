# Deployment Strategy: Vitamind SPA & Documentation

This project uses a two-workflow deployment strategy to GitHub Pages via the `gh-pages` branch.

## Infrastructure Overview

- **Deployment Branch**: `gh-pages`
- **Production URL**: `https://tommyroar.github.io/vitamind/`
- **Staging URL**: `https://tommyroar.github.io/vitamind/staging/`
- **GitHub Pages Setting**: Must be set to **"Deploy from a branch"** targeting `gh-pages` at `/ (root)`.

## Docs

Documentation lives in `docs/` and is synced to the [GitHub Wiki](https://github.com/tommyroar/vitamind/wiki) automatically via `sync-wiki.yaml` on every push to `main` that touches `docs/`.

## Workflows

### 1. Staging Preview (`deploy-staging.yaml`)
- **Trigger**: Automatic on every **Pull Request** targeting `main`.
- **What it does**:
  1. Builds MkDocs docs into `vitamind/public/docs/`.
  2. Builds the SPA with base path `/vitamind/staging/`.
  3. Deploys to the `staging/` directory on `gh-pages` (`keep_files: true`).
  4. Posts a PR comment with the staging URL.
- **Production is not touched** while the PR is open.

### 2. Production Deployment (`deploy-spa.yaml`)
- **Trigger**: Automatic on every **push or merge** to `main`.
- **What it does**:
  1. Builds MkDocs docs into `vitamind/public/docs/`.
  2. Builds the SPA with base path `/vitamind/`.
  3. Deploys to the root of `gh-pages` (`keep_files: true` preserves the `staging/` directory).

## Coexistence Policy

Both workflows use `peaceiris/actions-gh-pages` with `keep_files: true` so that the production root and `staging/` directory never overwrite each other on `gh-pages`.

## Security & Secrets

The SPA requires `VITE_MAPBOX_ACCESS_TOKEN` (a Mapbox public access token secured via domain whitelisting to `tommyroar.github.io/*`).
