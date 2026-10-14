/* Public, credential-free live checks: no owner token, wallet mutation or fake jobs.
 * Reports facts; a successful chat response is NOT a verified Robot Brain action.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {hasUnverifiedActionClaim} from '../workers/bubbles-tools/worker.mjs';

const TOOLS='https://bubbles-tools.marvaseater.workers.dev';
const BRAIN='https://infinity-brain-clock.marvaseater.workers.dev';
const SITE='https://quantaphi.org';
const TRUSTED='https://quantaphi.org';
const UNTRUSTED='https://untrusted-bubbles-check.invalid';

function check(ok,detail) {if(!ok)throw Error(detail);}
async function request(fetcher,url,options={}) {
 return fetcher(url,{...options,signal:options.signal||AbortSignal.timeout(30000),redirect:'follow'});
}
async function jsonResponse(response,label) {
 check(response.headers?.get('content-type')?.includes('application/json'),label+': missing JSON response');
 try{return await response.json()}catch{throw Error(label+': unreadable JSON')}
}
export async function runSmoke({fetcher=fetch,full=false}={}) {
 const report={schemaVersion:1,checkedAt:new Date().toISOString(),scope:full?'public-live-integration':'credential-free-boundary',
  ownerCredentialProvided:false,walletWrites:0,verifiedBrainJobReceipts:0,checks:[]};
 const add=(name,result,details={})=>report.checks.push({name,result,...details});
 try {
  const health=await request(fetcher,TOOLS+'/health',{method:'GET'});
  const h=await jsonResponse(health,'Bubbles health');
  check(health.status===200&&h.ok===true&&h.service==='bubbles-tools','Bubbles health not ready: HTTP '+health.status);
  check(h.tools?.chat===true&&h.tools?.speech===true,'Bubbles AI/speech bindings not available');
  add('worker_health','pass',{http:health.status,chatAvailable:true,speechAvailable:true});

  const foreign=await request(fetcher,TOOLS+'/v1/assist',{method:'POST',headers:{Origin:UNTRUSTED,'Content-Type':'application/json'},
   body:JSON.stringify({request:'This is only a denied-origin test'})});
  const denial=await jsonResponse(foreign,'Bubbles foreign-origin check');
  check(foreign.status===403&&denial.error==='origin_not_allowed','Bubbles foreign origin was not denied');
  add('foreign_origin_denied','pass',{http:foreign.status});

  // This is a read-only request with NO Authorization header.
  const brain=await request(fetcher,BRAIN+'/work/tickets/list',{method:'POST',
   headers:{Origin:TRUSTED,'Content-Type':'application/json'},body:'{}'});
  check([401,403,404].includes(brain.status),'Uncredentialed Robot Brain ticket read was not denied: '+brain.status);
  add('brain_owner_gate','pass',{http:brain.status,noCredential:true});

  if(full){
   const page=await request(fetcher,SITE+'/bubbles.html');
   check(page.status===200,'Bubbles page not publicly reachable: '+page.status);
   const html=await page.text();
   check(html.includes('/bubbles-ai.js?v=')&&html.includes('/bubbles-brain-actions.js?v='),
    'Bubbles live page missing its conversation or Brain action adapter');
   add('bubbles_page_assets','pass',{http:page.status});

   const brainScript=await request(fetcher,SITE+'/bubbles-brain-actions.js');
   check(brainScript.status===200,'Bubbles owner adapter not reachable: '+brainScript.status);
   const code=await brainScript.text();
   check(code.includes('resolveFollowupRequest')&&code.includes('makeJobs'),
    'Bubbles publicly served owner action adapter is stale');
   add('live_owner_adapter','pass',{http:brainScript.status,containsJobRouter:true});

   // Synthetic PUBLIC chat, no user information or owner identity. This checks
   // actual Workers AI inference, not whether a repository was edited.
   const chat=await request(fetcher,TOOLS+'/v1/assist',{method:'POST',
    headers:{Origin:TRUSTED,'Content-Type':'application/json'},
    body:JSON.stringify({request:'Continue building QuantaPhi robot brain.',
      input:'We already implemented an owner-only verified ticket adapter. State one specific next source/test verification step, distinguishing a plan from an actual completed job. No generic menu.'})});
   const answer=await jsonResponse(chat,'Bubbles live AI inference');
   check(chat.status===200&&answer.ok===true&&typeof answer.output==='string',
    'Bubbles GPT response unavailable: HTTP '+chat.status+' '+String(answer.error||''));
   check(answer.model==='@cf/openai/gpt-oss-120b','Bubbles model did not match deployed source');
   check(answer.output.length>35,'Bubbles output too short for useful engineering guidance');
   check(!hasUnverifiedActionClaim('Continue building QuantaPhi robot brain.',answer.output),
    'Bubbles claimed repository edits/deployment without an authenticated action receipt');
   check(answer.receipt?.repositoryActionsVerified===false,
    'Bubbles public chat receipt must clearly exclude verified repository actions');
   check(!/where should (?:we|i) focus|let me know which areas?|which areas? would you like/i.test(answer.output),
    'Bubbles returned a generic choose-a-focus menu');
   check(answer.receipt?.minted===false,'Public chat unexpectedly claims a token mint');
   add('live_gpt_reply','pass',{http:chat.status,model:answer.model,
      answerPreview:answer.output.slice(0,220),receiptStatus:answer.receipt?.status});
  }
  report.status='pass';
 }catch(error){
  report.status='failed';report.error=String(error?.message||error).slice(0,350);
 }
 return report;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const report=await runSmoke({full:process.env.BUBBLES_LIVE_FULL==='1'});
 await mkdir('repository-receipts',{recursive:true});
 await writeFile('repository-receipts/bubbles-live-smoke.json',JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(report.status!=='pass')process.exitCode=1;
}
