# GitHub Issue Lifecycle Protocol

## Phase 1: Exploration & Understanding
Before proposing any changes, thoroughly understand the codebase context.
- Use grep/glob to locate relevant components, logic, and tests.
- Read existing patterns, styling, and dependencies.
- Identify the appropriate testing framework and linting commands (e.g., `npm test`, `npm run lint`).

## Phase 2: Implementation & Local Verification
All code changes must be verified locally before being shared.
1. **Develop**: Implement the fix or feature on a descriptive feature branch.
2. **Verify**: Run the following commands:
    - **Unit Tests**: Ensure new and existing tests pass.
    - **Linting**: Ensure code adheres to project standards.
    - **Smoke Tests**: Perform basic functional verification of the affected area.
3. **Iterate**: If verification fails, fix the issues locally before proceeding.

## Phase 3: Pull Request
**CRITICAL: Never merge your own Pull Requests. Only propose changes and wait for a human maintainer to merge.**

1. **Create PR to Main**: Open a GitHub PR targeting the `main` branch, linked to the original issue (e.g., "Fixes #123").
2. **Feedback Loop**:
    - Respond to review feedback by pushing new commits to the same branch.
    - **Do NOT merge.** Keep the PR open until it is merged by the user.

## Phase 4: Deployment & Closure
An issue is only considered resolved when the fix is live in the production environment.
1. **Trigger Deployment**: After the merge into `main`, run `gh workflow run deploy.yaml`.
2. **Verify Live Site**: Confirm the changes are live at `https://tommyroar.github.io/vitamind/`.
3. **Handle Deploy Failures**: If a deployment fails due to infrastructure or transient issues, address the failure directly on `main`.
4. **Close Issue**: Only close the original GitHub issue AFTER the production deployment is successful and the fix is verified.
