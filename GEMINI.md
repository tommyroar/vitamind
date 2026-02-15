# Deployment Tasks for Vitamind SPA

This document outlines the repeatable steps for deploying the Vitamind SPA to GitHub Pages using Gemini CLI.

## Process Overview

To perform a deployment, follow these steps in order:
1.  **Run Unit Tests**
2.  **Check and Commit Git Changes**
3.  **Push Changes to GitHub**
4.  **Monitor and Verify GitHub Actions Workflow**

---

## Step 1: Run Unit Tests

**Objective:** Ensure all unit tests for the Vitamind SPA pass before proceeding with deployment.

**Gemini Task:**
Execute `npm test` within the `vitamind` directory.

```
run_shell_command(
    command="npm test",
    description="Run unit tests for the Vitamind React SPA.",
    dir_path="vitamind"
)
```

---

## Step 2: Check and Commit Git Changes

**Objective:** Review local Git changes, stage them, and commit before pushing.

**Gemini Task:**
1.  Check for uncommitted or unstaged changes:
    ```
    run_shell_command(
        command="git status --porcelain",
        description="Check for uncommitted or unstaged Git changes."
    )
    ```
2.  **Action Required:** If changes are present, Gemini CLI will prompt you to stage and commit them.
    *   **To proceed:** If you agree, Gemini CLI will stage all changes (`git add .`) and ask for a commit message. Provide a concise, descriptive message.
    *   **To abort:** If you decline, deployment will be aborted.

---

## Step 3: Push Changes to GitHub

**Objective:** Push the committed changes to the remote GitHub repository, triggering the GitHub Actions workflow.

**Gemini Task:**
Gemini CLI will prompt you to push your local commits to GitHub.

```
run_shell_command(
    command="git push",
    description="Push local commits to the remote GitHub repository."
)
```

---

## Step 4: Monitor and Verify GitHub Actions Workflow

**Objective:** Monitor the GitHub Actions workflow triggered by your push and verify the successful deployment of the SPA to GitHub Pages.

**Gemini Task:**
Always monitor the deployment with `gh cli`. For example, to monitor the latest run for a workflow named "deploy-vitamind.yaml" on the "vitamind" branch, you would use:
```
gh run list --workflow="deploy-vitamind.yaml" --branch="vitamind" --json databaseId,status,conclusion --limit 1
# Then, to watch a specific run:
# gh run watch <RUN_DATABASE_ID>
```

Gemini CLI will perform the following actions automatically:
1.  Retrieve the SHA of your latest commit.
2.  Identify the workflow ID for the "Deploy Vitamind SPA to GitHub Pages" workflow.
3.  Continuously monitor for the latest successful workflow run associated with your commit. This includes waiting for the run to appear and complete.
4.  Once a successful run is found, it will attempt to fetch and verify the content of your deployed SPA at `https://tommyroar.github.io/maps/vitamind/`. It will check for the expected title "vitamind".

```
# Internal Logic of Gemini CLI (equivalent to parts of the removed deploy.py script)
# This would involve:
# latest_commit_sha = run_shell_command(command="git rev-parse HEAD", ...)
# workflow_id = get_workflow_id("Deploy Vitamind SPA to GitHub Pages")
# get_latest_successful_deployment_run(workflow_id, commit_sha=latest_commit_sha)
# verify_deployed_content(SPA_DEPLOY_URL, EXPECTED_SPA_TITLE)
```
---
