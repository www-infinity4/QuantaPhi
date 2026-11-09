import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEyeClaims,routeEyeCapture,capturePublicBubbles,EYE_WORKFLOW,EYE_AUDIENCE} from '../workers/bubbles-cloud-browser/eye-capture.mjs';
import {diagnoseCapsule} from '../tools/eye/diagnose.mjs';
const now=1800000000;
const claims={iss:'https://token.actions.githubusercontent.com',aud:EYE_AUDIENCE,
 repository:'www-infinity4/QuantaPhi',repository_id:'1380883643',workflow_ref:EYE_WORKFLOW,
 ref:'refs/heads/main',event_name:'workflow_dispatch',run_id:'123456',exp:now+300,iat:now-10,nbf:now-20};
test('pin every relevant GitHub main workflow identity claim',()=>{
 assert.equal(checkEyeClaims(claims,now).run_id,'123456');
 for(const key of ['iss','aud','repository','repository_id','workflow_ref','ref','event_name','run_id']){
  assert.throws(()=>checkEyeClaims({...claims,[key]:'forged'},now),/eye_runner_identity_rejected/,key);
 }
 assert.throws(()=>checkEyeClaims({...claims,exp:now},now));
 assert.throws(()=>checkEyeClaims({...claims,iat:now-700},now));
});
test('deny unsigned and arbitrary browser requests',async()=>{
 const url='https://example.invalid/v1/eye/capture';
 const denied=await routeEyeCapture(new Request(url,{method:'POST',body:JSON.stringify({mode:'mobile'})}),{});
 assert.equal(denied.status,401);
 const authenticate=async()=>claims;
 for(const body of [{mode:'phone'},{mode:'mobile',url:'https://example.com'},{mode:'mobile',session:'owner'}]){
  const response=await routeEyeCapture(new Request(url,{method:'POST',body:JSON.stringify(body)}),{},{
   authenticate,capture:async()=>{throw Error('must_not_run')}});
  assert.equal(response.status,400);
 }
 const valid=await routeEyeCapture(new Request(url,{method:'POST',body:JSON.stringify({mode:'desktop'})}),{},{
  authenticate,capture:async(env,mode)=>({ok:true,mode,purple:{accepted:true}})});
 assert.equal(valid.status,200);assert.equal((await valid.json()).mode,'desktop');
});
const png=Buffer.from('89504e470d0a1a0a0102030405060708','hex').toString('base64');
function fakeBrowser({failure=false}={}){
 let closed=0;const sent=[];
 const socket=new EventTarget();socket.accept=()=>{};socket.close=()=>{};
 socket.send=str=>{
  const cmd=JSON.parse(str);sent.push(cmd);let result={};
  if(cmd.method==='Runtime.evaluate')result={result:{value:{red:{title:'Bubbles',url:'https://quantaphi.org/bubbles.html',
   docHeight:900,docWidth:390,width:390,height:844},yellow:[],orange:{overflow:false,brokenImages:[],overlaps:[],offscreenRight:[],blankCanvases:[]}}}};
  if(cmd.method==='Page.captureScreenshot')result={data:failure?undefined:png};
  queueMicrotask(()=>socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({id:cmd.id,result})})));
 };
 return {env:{BROWSER:{acquire:async()=>({sessionId:'11111111-1111-4111-8111-111111111111'}),
  devtools:{newTarget:async(session,url)=>{assert.equal(url,'about:blank');return{id:'page'}}},
  connectSession:async()=>({webSocket:{fetch:async()=>({webSocket:socket})}}),
  closeSession:async()=>{closed++}}},
  inspect:()=>({closed,sent})};
}
test('capture both PNGs and bounded layout with the existing Cloudflare browser',async()=>{
 const {env,inspect}=fakeBrowser();
 const r=await capturePublicBubbles(env,'mobile',{pause:async()=>{}});
 assert.equal(r.ok,true);assert.equal(r.screenshots.fold,png);assert.equal(r.screenshots.full,png);
 assert.equal(inspect().closed,1);
 assert.ok(inspect().sent.some(x=>x.method==='Page.navigate'&&x.params.url==='https://quantaphi.org/bubbles.html'));
 assert.ok(inspect().sent.some(x=>x.method==='Emulation.setDeviceMetricsOverride'&&x.params.width===390&&x.params.deviceScaleFactor===2));
 assert.ok(inspect().sent.some(x=>x.method==='Page.captureScreenshot'&&x.params.captureBeyondViewport===true));
});
test('reject screenshot failures and always close the disposable Chrome session',async()=>{
 const {env,inspect}=fakeBrowser({failure:true});
 await assert.rejects(capturePublicBubbles(env,'desktop',{pause:async()=>{}}),/eye_screenshot_invalid/);
 assert.equal(inspect().closed,1);
});

test('no clean visual result without verified screenshots',()=>{
 const result=diagnoseCapsule({purple:{accepted:false},orange:{overflow:false}});
 assert.equal(result.status,'capture_unverified');
 assert.equal(result.looks_ok,false);
 assert.equal(result.patch_hypothesis,null);
});
test('a verified clean capsule can be accepted without paid model inference',()=>{
 const result=diagnoseCapsule({purple:{accepted:true},orange:{overflow:false,
  brokenImages:[],overlaps:[],offscreenRight:[],blankCanvases:[]},errors:[]});
 assert.equal(result.status,'clean');assert.equal(result.looks_ok,true);assert.deepEqual(result.evidence,[]);
});
test('observed defects remain reviewable evidence, never fabricated source edits',()=>{
 const result=diagnoseCapsule({purple:{accepted:true},orange:{overflow:true,
  brokenImages:[{alt:'missing'}],overlaps:[{a:'Go',b:'Next'}],offscreenRight:[],blankCanvases:[]},
  errors:[{kind:'http_404'}]});
 assert.equal(result.status,'issues_observed');assert.equal(result.looks_ok,false);
 assert.equal(result.severity,'high');assert.equal(result.patch_hypothesis,null);
 assert.deepEqual(result.evidence,['horizontal_overflow','broken_images:1','overlapping_controls:1','browser_errors:1']);
});
