import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {callbackPage} from '../workers/bubbles-connections/router.mjs';
import {inspectConnectionIntegrity,ENTRY_REQUIREMENTS} from '../workers/bubbles-connections/integra.mjs';
const origin='https://quantaphi.org',prefix='/api/bubbles/connections';
const token='sq_'+'t'.repeat(40),state=provider=>(provider==='github'?'g':'c').repeat(43);
const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
async function fixture(context,{github=false,cloudflare=false,configured=true,failed=false}={}){
 const record={github,cloudflare,configured,failed,calls:[],completions:0,assist:0};
 const status=()=>inspectConnectionIntegrity({configured:{github:true,cloudflare:record.configured},cloudflareFullReady:record.configured,
  accounts:['github','cloudflare'].filter(id=>record[id]).map(provider=>({provider,label:'Synthetic '+provider,status:'connected',integrityVerified:true,expiresAt:Date.now()+3600000,grantedActions:[...ENTRY_REQUIREMENTS[provider]]}))});
 await context.addInitScript(({token})=>{window.QuantaCloudConnection={ready:Promise.resolve(),resolveDeviceToken:async()=>token};window.QuantaCloudConnectionDisableAutoRecovery=true;},{token});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin==='https://github.com'||url.origin==='https://dash.cloudflare.com'){
   return route.fulfill({contentType:'text/html',body:'<!doctype html><button id="consent">Authorize synthetic account</button><script>document.getElementById("consent").onclick=()=>location.href='+JSON.stringify(origin+prefix+'/'+(url.hostname==='github.com'?'github':'cloudflare')+'/callback?state='+url.searchParams.get('state')+'&code=synthetic-code')+'</script>'});
  }
  if(url.origin!==origin)return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"synthetic_offline"}'});
  if(url.pathname.startsWith(prefix)){
   record.calls.push(url.pathname);
   const cb=url.pathname.match(/\/(github|cloudflare)\/callback$/);
   if(cb){const response=callbackPage(cb[1]);return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}
   const reply=body=>route.fulfill({contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(body)});
   if(url.pathname.endsWith('/gate/status'))return record.failed?route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"connection_operation_failed"}'}):reply(status());
   if(url.pathname.endsWith('/start')){
    const {provider}=request.postDataJSON();
    const auth=new URL(provider==='github'?'https://github.com/login/oauth/authorize':'https://dash.cloudflare.com/oauth2/auth');
    auth.search=new URLSearchParams({state:state(provider),redirect_uri:origin+prefix+'/'+provider+'/callback'}).toString();
    return reply({ok:true,authorizationUrl:auth.href});
   }
   if(url.pathname.endsWith('/complete')){
    const body=request.postDataJSON();expect(body.code).toBe('synthetic-code');expect(body.state).toBe(state(body.provider));
    record[body.provider]=true;record.completions++;return reply({ok:true,account:{provider:body.provider,status:'connected'}});
   }
   return reply({ok:true,providers:[],accounts:[]});
  }
  if(['/cloud-wallet-client.js','/robot-brain-owner.js'].includes(url.pathname))return route.fulfill({contentType:'application/javascript',body:''});
  try{
   const path=resolve('.'+decodeURIComponent(url.pathname));
   if(!path.startsWith(process.cwd()+'/'))throw Error('unsafe path');
   return route.fulfill({contentType:types[extname(path)]||'text/plain',body:await readFile(path)});
  }catch{return route.fulfill({status:404,body:'Not found'});}
 });
 return record;
}
async function signIn(page,context,provider){
 const popupPromise=page.waitForEvent('popup');
 await page.locator(provider==='github'?'#bubblesGithubSignIn':'#bubblesCloudflareSignIn').click();
 const popup=await popupPromise;
 const closed=popup.waitForEvent('close');
 await popup.getByRole('button',{name:'Authorize synthetic account'}).click();
 await closed;
 // The source's callback, popup transport, code exchange and status refresh all run.
}

test('GitHub then Cloudflare opens the real application and hides both sets of sign-in buttons',async({page,context})=>{
 const record=await fixture(context);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/bubbles.html');
 await expect(page.locator('#bubblesGithubSignIn')).toBeEnabled();
 await expect(page.locator('#bubblesCloudflareCard')).toBeHidden();
 await expect(page.locator('#bubblesApplication')).toBeHidden();
 await signIn(page,context,'github');
 await expect(page.locator('#bubblesGithubCard')).toBeHidden();
 await expect(page.locator('#bubblesCloudflareSignIn')).toBeEnabled();
 await expect(page.locator('#bubblesApplication')).toBeHidden();
 await signIn(page,context,'cloudflare');
 await expect(page.locator('#bubblesSigninGate')).toBeHidden();
 await expect(page.locator('#chatBubblesSigninGate')).toBeHidden();
 await expect(page.locator('#bubblesApplication')).toBeVisible();
 await expect(page.locator('.ba-panel')).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Message Bubbles'})).toBeVisible();
 expect(record.completions).toBe(2);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('missing Cloudflare client keeps the application locked and explains setup',async({page,context})=>{
 await fixture(context,{github:true,configured:false});await page.goto(origin+'/bubbles.html');
 await expect(page.locator('#bubblesSigninStatus')).toContainText('administrator setup');
 await expect(page.locator('#bubblesCloudflareSignIn')).toBeDisabled();
 await expect(page.locator('#bubblesApplication')).toBeHidden();
 await expect(page.locator('#bubblesGithubCard')).toBeHidden();
 await page.screenshot({path:'/tmp/bubbles-signin-setup-fixture.png'});
});
test('saved verified connections open without login clutter; revoked or failed checks close the app',async({page,context})=>{
 const record=await fixture(context,{github:true,cloudflare:true});await page.goto(origin+'/bubbles.html');
 await expect(page.locator('#bubblesApplication')).toBeVisible();
 await expect(page.locator('#bubblesSigninGate')).toBeHidden();
 record.cloudflare=false;await page.evaluate(()=>window.dispatchEvent(new Event('bubbles:connections-changed')));
 await expect(page.locator('#bubblesSigninGate')).toBeVisible();
 await expect(page.locator('#bubblesApplication')).toBeHidden();
 await expect(page.locator('.ba-composer')).toBeHidden();
 record.failed=true;await page.locator('#chatBubblesRetrySignInCheck').click();
 await expect(page.locator('#chatBubblesSigninStatus')).toContainText('stays locked');
 await expect(page.locator('#bubblesApplication')).toBeHidden();
});
test('a module-load failure never exposes the application or composer',async({page,context})=>{
 await fixture(context);await context.route('**/bubbles-signin-gate.mjs?*',route=>route.abort());
 await page.goto(origin+'/bubbles.html');
 await expect(page.locator('#bubblesSigninStatus')).toContainText('stays locked');
 await expect(page.locator('#bubblesApplication')).toBeHidden();
 await page.locator('.ba-launcher').click();await expect(page.locator('.ba-composer')).toBeHidden();
 await expect(page.locator('#chatBubblesSigninStatus')).toContainText('stays locked');
});
test('closed consent windows restore the sign-in button for retry',async({page,context})=>{
 await fixture(context);await page.goto(origin+'/bubbles.html');
 const popupPromise=page.waitForEvent('popup');await page.locator('#bubblesGithubSignIn').click();
 const popup=await popupPromise;await popup.getByRole('button',{name:'Authorize synthetic account'}).waitFor();await popup.close();
 await expect(page.locator('#bubblesSigninStatus')).toContainText('window closed');
 await expect(page.locator('#bubblesGithubSignIn')).toBeEnabled();
 await expect(page.locator('#bubblesApplication')).toBeHidden();
});
test('a provider return without window.opener reuses the same verified session and returns to current Bubbles',async({page,context})=>{
 const record=await fixture(context,{github:true});
 await page.goto(origin+prefix+'/cloudflare/callback?state='+state('cloudflare')+'&code=synthetic-code&return_to=https://old.example/');
 await expect(page).toHaveURL(origin+'/bubbles.html');
 expect(record.completions).toBe(1);
 await expect(page.locator('#bubblesSigninGate')).toBeHidden();
 await expect(page.locator('#bubblesApplication')).toBeVisible();
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('synthetic-code');
});

test('the floating website orb opens sign-in without requesting microphone permission',async({page,context})=>{
 await fixture(context);
 await page.addInitScript(()=>{
  window.__micRequests=0;
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{window.__micRequests++;throw Error('synthetic denied');}},configurable:true});
 });
 await page.goto(origin+'/bubbles.html');
 await page.locator('.ba-launcher').click();
 await expect(page.locator('#chatBubblesGithubSignIn')).toBeEnabled();
 await expect(page.locator('#chatBubblesCloudflareCard')).toBeHidden();
 await expect(page.locator('.ba-composer')).toBeHidden();
 expect(await page.evaluate(()=>window.__micRequests)).toBe(0);
});
test('the Android website view uses the same required gate and keeps the native microphone adapter',async({page,context})=>{
 await fixture(context,{github:true,cloudflare:true});
 await page.goto(origin+'/bubbles.html?nativeOverlay=1');
 await expect(page.locator('#chatBubblesSigninGate')).toBeHidden();
 await expect(page.getByRole('textbox',{name:'Message Bubbles'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // This checks hosted WebView markup only, not a physical Android permission.
});
