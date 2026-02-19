Push one or more markdown files to the GitHub wiki for tommyroar/vitamind.

Usage: /wiki <page-name> or /wiki (to update an existing file you describe)

Steps:
1. Determine the target wiki page name and content from the user's request.
   - The wiki home page is always `Home.md`.
   - All other pages use their natural name, e.g. `costs.md`.
2. Clone (or reuse) the wiki repo into a temp directory:
   ```
   git clone https://x-access-token:$(gh auth token)@github.com/tommyroar/vitamind.wiki.git /tmp/vitamind.wiki
   ```
   If `/tmp/vitamind.wiki` already exists, run `git pull` inside it instead.
3. Write the page content to `/tmp/vitamind.wiki/<PageName>.md`.
4. Commit and push:
   ```
   cd /tmp/vitamind.wiki
   git config user.name "github-actions[bot]"
   git config user.email "github-actions[bot]@users.noreply.github.com"
   git add -A
   git diff --cached --quiet || git commit -m "docs: update <PageName>"
   GH_TOKEN=$(gh auth token)
   git remote set-url origin https://x-access-token:${GH_TOKEN}@github.com/tommyroar/vitamind.wiki.git
   git push
   ```
5. Confirm success and print the wiki URL: `https://github.com/tommyroar/vitamind/wiki/<PageName>`
