import { readFile, appendFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function notification(env, event) {
  if (env.GITHUB_SERVER_URL !== 'https://github.com' || env.GITHUB_EVENT_NAME !== 'pull_request') {
    throw new Error('Inkspect supports pull_request events on GitHub.com.');
  }
  if (event.repository?.private !== false) throw new Error('This action supports public repositories.');
  if (event.pull_request?.draft) return null;
  const body = {
    repository: env.GITHUB_REPOSITORY,
    pull_number: event.pull_request?.number,
    head_sha: event.pull_request?.head?.sha,
    run_id: env.GITHUB_RUN_ID,
    run_attempt: env.GITHUB_RUN_ATTEMPT,
    ci_workflow: (env['INPUT_CI-WORKFLOW'] || 'CI').trim(),
  };
  if (body.repository !== event.repository.full_name || !/^[\w.-]+\/[\w.-]+$/.test(body.repository || '')
    || !Number.isSafeInteger(body.pull_number) || body.pull_number < 1 || !/^[a-f0-9]{40}$/.test(body.head_sha || '')
    || !/^[1-9]\d{0,19}$/.test(body.run_id || '') || !/^[1-9]\d{0,5}$/.test(body.run_attempt || '')
    || !body.ci_workflow || body.ci_workflow.length > 100 || /[\r\n\x00]/.test(body.ci_workflow) || body.ci_workflow.includes('${{')) {
    throw new Error('GitHub PR metadata or CI workflow name is invalid.');
  }
  return body;
}

export async function sendNotification(body, fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher('https://app.inkspect.si/api/oss-review-requests', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
        headers: { 'content-type': 'application/json', 'user-agent': 'Inkspect-Action/1' },
        body: JSON.stringify(body),
      });
    } catch {
      if (attempt === 2) throw new Error('Inkspect could not be reached. Re-run this workflow to retry.');
      await sleep(2000 * (attempt + 1)); continue;
    }
    if (response.status === 202) {
      const raw = await response.text();
      if (raw.length > 2048) throw new Error('Inkspect returned an unexpected response.');
      const result = JSON.parse(raw);
      if (result.status !== 'received' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(result.request_id)) throw new Error('Inkspect returned an unexpected response.');
      return result.request_id;
    }
    await response.body?.cancel();
    if ([502, 503, 504].includes(response.status) && attempt < 2) { await sleep(2000 * (attempt + 1)); continue; }
    if (response.status === 403) throw new Error('Install .github/workflows/inkspect.yml on the default branch, then open or update a public PR.');
    if (response.status === 409) throw new Error('This PR changed or is no longer eligible. Retry on its latest commit.');
    if (response.status === 429) throw new Error('Inkspect is receiving too many requests. Retry later.');
    throw new Error(`Inkspect did not accept the request (HTTP ${response.status}).`);
  }
}

export async function main(env = process.env) {
  if (!env.GITHUB_EVENT_PATH || (await stat(env.GITHUB_EVENT_PATH)).size > 1_000_000) throw new Error('GitHub event payload is missing or too large.');
  const body = notification(env, JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8')));
  if (!body) { console.log('Inkspect: draft PR skipped.'); return; }
  const id = await sendNotification(body);
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `request-id=${id}\n`);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, `## [Inkspect](https://inkspect.si) · Code review\n\nRequest received. Review starts after repository approval and successful CI. Feedback is posted on the PR by Inkspect.\n\nRequest: \`${id}\`\n\n[Inkspect](https://inkspect.si) · Every line deserves a second look.\n`);
  console.log('Inkspect: request received. Waiting for repository approval and successful CI.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`Inkspect: ${String(error.message).replace(/[\r\n]/g, ' ')}`); process.exitCode = 1; });
}
