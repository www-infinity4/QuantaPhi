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
async function walletToken(){
 let token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
 if(!token)try{token=new window.InfinityCloudWallet().token()}catch{}
 if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||''))throw Error('Connect your existing Unified Wallet to create and publish your goods.');
 return token;
}
async function shopPhiRequest(path,body){
 if(!/^\/(?:listings(?:\/[0-9a-f-]{36}\/(?:publish|remove|edit))?)$/i.test(path))throw Error('Invalid seller action');
 const token=await walletToken();
 const response=await fetch('/quant-ai/api/shopphi'+path,{
  method:body===undefined?'GET':'POST',
  headers:{Authorization:'Bearer '+token,...body===undefined?{}:{'Content-Type':'application/json'}},
  ...body===undefined?{}:{body:JSON.stringify(body)},cache:'no-store',
  signal:AbortSignal.timeout(25000)
 });
 const data=await response.json();
 if(!response.ok||!data.ok)throw Error(data.error||'ShopPhi seller service unavailable');
 return data;
}
async function shopPhiUpload(blob){
 if(!(blob instanceof Blob)||blob.type!=='image/webp'||blob.size>4500000)throw Error('Choose a product image up to 4.5 MB.');
 const token=await walletToken();
 const response=await fetch('/quant-ai/api/shopphi/media',{method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'image/webp'},body:blob,
  cache:'no-store',signal:AbortSignal.timeout(45000)});
 const data=await response.json();
 if(!response.ok||!data.ok)throw Error(data.error||'Seller photo upload failed');
 return data;
}
window.QuantAIPersonal=Object.freeze({
 profile:()=>request('/personal/profile'),saveDefaults:defaults=>request('/personal/profile',{consent:true,defaults}),
 assist:body=>request('/seller/assist',body),chat:message=>request('/chat',{message}),
 shopPhiRequest,shopPhiUpload
});
})();
