(function(){
'use strict';
async function request(path,body){
 if(!/^\/(personal\/profile|seller\/assist|chat)$/.test(path))throw Error('Unknown private assistant action.');
 let token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
 if(!token)try{token=new window.InfinityCloudWallet().token()}catch{}
 if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||''))throw Error('Connect your existing Unified Wallet for private assistance. No name is required.');
 const response=await fetch('/quant-ai/api'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...body?{'Content-Type':'application/json'}:{}},...body?{body:JSON.stringify(body)}:{},cache:'no-store',signal:AbortSignal.timeout(30000)});
 const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Private Quant-AI assistance unavailable');return result;
}
window.QuantAIPersonal=Object.freeze({profile:()=>request('/personal/profile'),saveDefaults:defaults=>request('/personal/profile',{consent:true,defaults}),assist:body=>request('/seller/assist',body),chat:message=>request('/chat',{message})});
})();
