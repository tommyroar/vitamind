# PATCH Expedited Release Protocol

This protocol defines the process for bypassing the standard multi-step staging-to-main transition for critical hotfixes or minor "quick-fix" updates.

## Trigger Conditions
The Gemini CLI may utilize this expedited protocol if:
1.  **Explicit Instruction**: The user explicitly commands a "PATCH" or "expedited" merge.
2.  **Quick-Fix Label**: The GitHub issue is tagged with the **`quick-fix`** label.

## Process
1.  **Develop & Verify**: Implement the fix on a feature branch and run local unit tests and linting.
2.  **Create PR**: Raise a PR targeting `main`.
3.  **Autonomous Merge**: In a PATCH scenario, if the PR passes all CI checks (staging deploy succeeds), the agent is authorized to merge the PR directly into `main` to trigger production deployment.
4.  **Verification**: Monitor the `deploy-spa.yaml` workflow and verify the live production site.
5.  **Closure**: Close the PR and the original issue with a summary of the patch.

## Limitations
- This protocol should **not** be used for new features or major structural changes.
- It is strictly reserved for bug fixes, documentation typos, or infrastructure configuration updates (like `.gitignore` or workflow fixes).
