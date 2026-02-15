# Project Indexing Guide

This document describes how to register new applications and documentation sites with the [tommyroar.github.io](https://tommyroar.github.io) central index, which is now a **React Single Page Application (SPA)** using the **Cloudscape Design System**.

## 1. Create an App Stub

To add a new project, create a JSON file in the `apps/` directory (e.g., `apps/my-new-app.json`).

### Schema
```json
{
  "name": "Display Name",
  "root_path": "/path-to-app/",
  "docs_path": "/path-to-docs/",
  "description": "Markdown formatted description. Newlines are handled automatically.",
  "status": "Active" | "Maintenance" | "Archived",
  "tags": ["Tag1", "Tag2"],
  "thumbnail": "Optional: /thumbnails/my-new-app.png (automatically generated if apps/my-new-app.png exists)"
}
```
If an image file named `[app-name].png` exists in the `apps/` directory (e.g., `apps/my-new-app.png`), it will be automatically copied to `public/thumbnails/` and its path will be added to the `thumbnail` field in the generated project data.

## 2. Styling and Features

The index page is styled using the **Amazon Cloudscape Design System**, providing an AWS-like look and feel.
It supports:
- **Markdown Rendering**: Project descriptions are rendered using Markdown.
- **Dark Mode**: A dark mode toggle is available, with dark mode enabled by default.
- **Project Thumbnails**: If a `[app-name].png` file is present alongside your JSON stub, it will be displayed as a thumbnail on the project card.

## 3. Automate Updates via GitHub Actions

To trigger an automatic index rebuild from a sub-repository after deployment, add the following step to your workflow. Note: You must provide a Personal Access Token (PAT) with `repo` scope as a secret.

```yaml
- name: Notify Central Index
  run: |
    curl -X POST \
      -H "Accept: application/vnd.github.v3+json" \
      -H "Authorization: token ${{ secrets.INDEX_UPDATE_TOKEN }}" \
      https://api.github.com/repos/tommyroar/tommyroar.github.io/dispatches \
      -d '{"event_type": "update_project"}'
```

## 4. Local Development and Verification

To set up and test the project locally:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Bundle Project Data**: This script reads JSON stubs from `apps/` and generates `src/data/projects.json`, including copying thumbnails.
    ```bash
    node scripts/bundle_apps.js
    ```
3.  **Run Unit Tests**:
    ```bash
    npm test
    ```
4.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    This will serve the React SPA, automatically recompiling on changes.

## 5. Adding to Gemini CLI Context

To ensure Gemini CLI understands this process when working within this directory:

1.  **Automatic Discovery**: Gemini CLI automatically scans the current working directory (CWD) and identifies this `INDEX.md` file in the file tree.
2.  **Explicit Reference**: You can ask the agent: *"Read INDEX.md to understand how to register a new app."*
3.  **Persistent Guidance**: For permanent "system-level" instructions across sessions, add a reference to this file in your `GEMINI.md`.
