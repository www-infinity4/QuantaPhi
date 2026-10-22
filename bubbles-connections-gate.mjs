/* Fresh, bounded account-gate transport.
 * Kept separate from the legacy pinned /bubbles-connections.mjs route until
 * quantaphi-site's historical release mapping is retired. */
import {AccountConnections as LegacyConnections,resolveConnectorWalletToken} from './bubbles-connections.mjs';
export {resolveConnectorWalletToken};
export class AccountConnections extends LegacyConnections {
 constructor(options={}){
  super(options);
  this.timeoutMs=Math.max(1,Number(options.timeoutMs)||10000);
 }
 async call(path,body){
  const controller=new AbortController();
  let timer;
  const API='/api/bubbles/connections';
  const task=async()=>{
   const credential=path==='/pair/redeem'?'':await this.token();
   const response=await this.request(API+path,{
    method:body?'POST':'GET',cache:'no-store',
    headers:{...(credential?{Authorization:'Bearer '+credential}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal
   });
   let data;
   try{data=await response.json()}catch{throw Error('connection_response_invalid')}
   if(!response.ok||!data.ok)throw Error(data.error||'account_connection_unavailable');
   return data;
  };
  try{
   return await Promise.race([task(),new Promise((_,reject)=>{
    timer=setTimeout(()=>{controller.abort();reject(Error('connection_timeout'))},this.timeoutMs);
   })]);
  }finally{clearTimeout(timer)}
 }
}