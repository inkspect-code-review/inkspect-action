# Inkspect

**Deeply intelligent code review.**

Request an [Inkspect](https://inkspect.si) review for a public GitHub pull request.
No API key, GitHub App installation, OIDC permission or repository write permission
is needed. The action sends public PR and workflow identifiers; it never reads or
sends a GitHub token, model key or your checked-out source files.

## Setup

Save [examples/inkspect.yml](examples/inkspect.yml) as
`.github/workflows/inkspect.yml` on your repository's default branch. Set
`ci-workflow` to the name of your existing pull-request CI workflow (default: `CI`).
Use `permissions: {}` and do not add checkout or token inputs. GitHub still
applies its normal Actions policies, including approval for some fork workflows.

After the workflow is merged to the default branch, open or update a non-draft
PR. Its request will be visible to the Inkspect team for approval. Once enabled,
Inkspect verifies the current PR and successful CI, reviews the source changes,
and posts feedback from its review account. Future requests from enabled
repositories are handled automatically within their review limits.

The workflow's green check means **request received**, not review completed or
changes approved. Review results appear separately on the PR. A request waiting
for repository approval does not run a model. Removing the default-branch
installation prevents new action requests; contact Inkspect to disable an
existing sponsored server-monitor approval as well.

For a fixed release, replace `@v1` with a published 40-character commit SHA.
The code is plain JavaScript with no package dependencies or build step.

## Data sent

Repository name, PR number, head commit SHA, workflow run ID and attempt, and the
selected CI workflow name. These identifiers are public hints, not proof of the
caller's identity. Inkspect verifies them independently with GitHub and checks
the default-branch installation and repository approval before starting work.

## Development

Run `npm test` on Node.js 22 or later. GitHub runs the action on Node.js 24.
See [GitHub's action metadata reference](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax).

Every line deserves a second look.
