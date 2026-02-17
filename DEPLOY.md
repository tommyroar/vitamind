# Deployment Strategy: Vitamind SPA & Documentation

This project uses a branch-based deployment strategy to GitHub Pages, allowing the React Single Page Application (SPA) and the MkDocs documentation to coexist on the same domain.

## Infrastructure Overview

- **Deployment Branch**: `gh-pages`
- **Root URL (`/`)**: Serves the Vitamind React SPA.
- **Docs URL (`/docs/`)**: Serves the MkDocs technical documentation.
- **GitHub Pages Setting**: Must be set to **"Deploy from a branch"** targeting the `gh-pages` branch and `/ (root)` folder.

## Workflows

### 1. Vitamind SPA Deployment (`deploy-spa.yaml`)
- **Trigger**: Automatic on every push or merge to the `main` branch. Can also be triggered manually via `workflow_dispatch`.
- **Action**: Builds the React application and pushes the contents of the `dist` folder to the root of the `gh-pages` branch.
- **Coexistence**: Uses `keep_files: true` to ensure the `/docs/` directory is not deleted during SPA updates.

### 2. Documentation Deployment (`deploy-docs.yaml`)
- **Trigger**: **Manual only** via `workflow_dispatch`.
- **Action**: Builds the MkDocs site and pushes the output to the `docs/` directory on the `gh-pages` branch.
- **Coexistence**: Uses `keep_files: true` to ensure the SPA files at the root are not deleted during documentation updates.

## Security & Secrets

### Mapbox Public Token
The SPA requires a Mapbox public access token (`VITE_MAPBOX_ACCESS_TOKEN`). 
- This token is bundled into the client-side JavaScript.
- It is secured via **domain whitelisting** in the Mapbox dashboard (restricted to `tommyroar.github.io/*`).
- GitHub Push Protection has been configured to allow this specific secret. If rotated, the new secret may need to be unblocked at:
  [GitHub Secret Scanning](https://github.com/tommyroar/vitamind/security/secret-scanning)

## Manual Deployment via CLI

To manually trigger a deployment using the GitHub CLI (`gh`):

```bash
# Deploy SPA
gh workflow run deploy-spa.yaml

# Deploy Documentation
gh workflow run deploy-docs.yaml
```

## Troubleshooting

- **404 Errors**: Ensure the `gh-pages` branch exists and that the GitHub Pages settings are correctly configured to deploy from that branch.
- **Overwritten Content**: Ensure both workflows use `peaceiris/actions-gh-pages` with the `keep_files: true` option.
