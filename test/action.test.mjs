import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { notification, sendNotification } from '../index.mjs';

const env = { GITHUB_SERVER_URL:'https://github.com', GITHUB_EVENT_NAME:'pull_request', GITHUB_REPOSITORY:'example/project', GITHUB_RUN_ID:'42', GITHUB_RUN_ATTEMPT:'1', GITHUB_TOKEN:'must-not-be-sent', ACTIONS_ID_TOKEN_REQUEST_TOKEN:'must-not-be-sent' };
const event = { repository:{ full_name:'example/project', private:false }, pull_request:{ number:3, draft:false, head:{sha:'a'.repeat(40)} } };
test('only public PR identifiers are sent; drafts skip and other events/private repos fail', () => {
  assert.deepEqual(notification(env,event),{repository:'example/project',pull_number:3,head_sha:'a'.repeat(40),run_id:'42',run_attempt:'1',ci_workflow:'CI'});
  assert.equal(notification(env,{...event,pull_request:{...event.pull_request,draft:true}}),null);
  assert.throws(()=>notification({...env,GITHUB_EVENT_NAME:'pull_request_target'},event));
  assert.throws(()=>notification(env,{...event,repository:{...event.repository,private:true}}));
  assert.throws(()=>notification({...env,'INPUT_CI-WORKFLOW':'CI\nmalicious'},event));
});
test('notification retries a transient failure without credentials and reports receipt only', async () => {
  const calls=[]; const id='00000000-0000-4000-8000-000000000001';
  const result=await sendNotification(notification(env,event),async(url,init)=>{
    calls.push({url,init});return calls.length===1?new Response('',{status:503}):Response.json({status:'received',request_id:id},{status:202});
  },async()=>{});
  assert.equal(result,id);assert.equal(calls.length,2);
  assert.ok(calls.every(c=>c.url==='https://app.inkspect.si/api/oss-review-requests' && c.init.redirect==='error'));
  assert.doesNotMatch(JSON.stringify(calls),/must-not-be-sent|authorization/i);
  await assert.rejects(sendNotification({},async()=>new Response('',{status:403})),/default branch/);
  await assert.rejects(sendNotification({},async()=>Response.json({status:'completed',request_id:id},{status:202})),/unexpected/);
});
test('workflow uses empty permissions and no checkout, keys or OIDC',async()=>{
  const workflow=await readFile(new URL('../examples/inkspect.yml',import.meta.url),'utf8');
  assert.match(workflow,/permissions: \{\}/);assert.match(workflow,/uses: inkspect-code-review\/inkspect-action@v1/);
  assert.doesNotMatch(workflow,/checkout|id-token|secrets\.|github\.token|pull_request_target/);
});
