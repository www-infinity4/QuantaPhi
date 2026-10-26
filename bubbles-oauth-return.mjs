import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections-gate.mjs?v=20261025-required1';

// The destination is a fixed first-party application, never an OAuth query
// parameter, provider-supplied URL, old ChatGPT app, or cached connection flag.
export const BUBBLES_RETURN='https://quantaphi.org/bubbles.html';
export async function completeBubblesReturn({provider,state,code,error,root=window,document:doc=document,client:providedClient}){
 const status=doc.getElementById('status');
 const set=text=>{if(status)status.textContent=text;};
 if(!['github','cloudflare','google'].includes(provider)||!/^[A-Za-z0-9_-]{43}$/.test(state||'')){
  set('This sign-in return is invalid. Open Bubbles and sign in again.');return false;
 }
 // A callback without a code is not a successful return. Never tell the
 // initiating app to exchange an absent or oversized authorization code.
 if(!error&&(typeof code!=='string'||!code||code.length>4096)){
  set('The provider did not return a valid sign-in code. Please start again in Bubbles.');return false;
 }
 if(root.opener&&root.opener.closed!==true){
  const message={type:'bubbles:oauth-return',provider,state,code,error:error?'provider_declined':null};
  for(const origin of ['https://quantaphi.org','https://www.quantaphi.org'])root.opener.postMessage(message,origin);
  set('Return to your Bubbles window while it verifies the connection.');return true;
 }
 if(error){set('Authorization was declined. Open Bubbles to try again.');return false;}
 set('Reconnecting this browser to the current Bubbles application…');
 try{
  // A provider may sever window.opener. Reuse only this browser's existing
  // verified wallet; complete() still requires the original user AND session.
  // No token, code or positive connection flag is put in a URL or web storage.
  if(!providedClient&&!root.QuantaCloudConnection){
   root.QuantaCloudConnectionDisableAutoRecovery=true;
   await import('/cloud-wallet-client.js?v=20261025-oauth-return1');
  }
  const client=providedClient||new AccountConnections({token:()=>resolveConnectorWalletToken(root),root});
  await client.call('/complete',{provider,state,code});
  set('Account authorization saved. Returning to Bubbles to verify both sign-ins…');
  root.location.replace(BUBBLES_RETURN);return true;
 }catch{
  set('This browser could not verify the original account session. Open Bubbles in the browser where you began sign-in and try again. No connection is confirmed here.');
  return false;
 }
}
