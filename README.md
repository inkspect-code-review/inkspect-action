# Inkspect for GitHub Actions

Notify Inkspect when a public pull request opens or changes. Inkspect starts
the review once the repository is approved and CI passes on that commit.

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

## How a request works

[The action manifest](action.yml) declares one input, `ci-workflow`, and one output,
`request-id`. GitHub runs [index.mjs](index.mjs) directly on Node.js 24.

1. `notification()` reads the GitHub event and builds a payload with the repository,
   PR number, head SHA, workflow run ID, attempt and CI workflow name. Drafts are skipped.
2. `sendNotification()` posts those identifiers to Inkspect. The action runs without
   checkout, API keys or token permissions.
3. On HTTP 202, `main()` writes the receipt ID to the step output. Inkspect verifies
   the PR and workflow against GitHub before reviewing the code.

## Test locally

Run `npm test` with Node.js 22 or newer. The [action tests](test/action.test.mjs)
use sample events and a stub HTTP client to check payload validation, retry
behavior and receipt handling.
