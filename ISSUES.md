# GitHub Issue Lifecycle Protocol

This document defines the mandatory procedure for the Gemini CLI when addressing GitHub issues.

## Phase 1: Exploration & Understanding
Before proposing any changes, the agent must thoroughly understand the codebase context.
- Use `grep_search` and `glob` to locate relevant components, logic, and tests.
- Use `read_file` to analyze existing patterns, styling, and dependencies.
- Identify the appropriate testing framework and linting commands (e.g., `npm test`, `npm run lint`).

## Phase 2: Implementation & Local Verification
All code changes must be verified locally before being shared.
1. **Develop**: Implement the fix or feature on a descriptive feature branch.
2. **Verify**: Run the following commands:
    - **Unit Tests**: Ensure new and existing tests pass.
    - **Linting**: Ensure code adheres to project standards.
    - **Smoke Tests**: Perform basic functional verification of the affected area.
3. **Iterate**: If verification fails, fix the issues locally before proceeding.

## Phase 3: Pull Request Lifecycle
1. **Create PR**: Open a GitHub PR linked to the original issue (e.g., "Fixes #123").
2. **Feedback Loop**: 
    - Monitor for tagged comments or review feedback on the PR.
    - Respond to feedback by pushing new revisions (commits) to the same branch.
    - Continue this cycle until the PR is merged by a maintainer.

## Phase 4: Deployment & Closure
An issue is only considered resolved when the fix is live in the production environment.
1. **Monitor Deployment**: After the PR is merged into `main`, monitor the `deploy-spa.yaml` workflow.
2. **Verify Live Site**: Verify that the changes are correctly reflected at the production URL.
3. **Handle Deploy Failures**:
    - If a deployment fails due to infrastructure or transient issues, address the failure directly on `main` (do not re-open the PR unless the failure is caused by a fundamental code flaw that requires a revert).
4. **Close Issue**: Only close the original GitHub issue AFTER the deployment is successful and the fix is verified in production.
