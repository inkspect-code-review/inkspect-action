# Inkspect for GitHub Actions

Request an Inkspect review for a public pull request after CI passes. The action
runs without checkout, API keys or GitHub token permissions.

## Setup

1. Copy [the example workflow](examples/inkspect.yml) to
   `.github/workflows/inkspect.yml` on the default branch. Keep its workflow,
   job and step names and the `permissions: {}` setting.
2. Set `ci-workflow` to the name of your existing pull-request CI workflow
   (default `CI`). To pin the action, replace `@v1` with a published commit’s full SHA.
3. Open or update a non-draft PR. The first request goes to Inkspect for
   repository approval. Once enabled, eligible PRs receive feedback on GitHub
   after their current commit passes CI, subject to the repository’s review limit.

A green action check acknowledges receipt. Review findings appear separately on
the PR. Removing the workflow stops new action requests. Contact Inkspect to
disable an existing sponsored server-monitor approval.

## Data and permissions

The action sends the repository name, PR number, head SHA, workflow run ID and
attempt, and selected CI workflow name. Inkspect verifies these public identifiers,
the installed workflow and the approval with GitHub before reviewing source.
GitHub’s normal fork approval rules still apply.
[Workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)

## Development

Run `npm test` with Node.js 22 or newer. The action runs on Node.js 24 and has
no package dependencies or build step.
