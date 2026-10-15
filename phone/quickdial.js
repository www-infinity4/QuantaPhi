/* Infinity Phone internal service dialing.
 * These are application routes, not assigned telephone numbers, SIM credentials,
 * emergency services, or actual PSTN calls.
 */
(function(root,create){
 'use strict';
 const api=create();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.InfinityQuickDial=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const ENTRIES=Object.freeze([
  Object.freeze({code:'*100',label:'QuantaPhi live portal',url:'/',description:'Home, search and Infinity feed'}),
  Object.freeze({code:'*101',label:'Infinity Platinum search',url:'/platinum/',description:'Browse, search and collect'}),
  Object.freeze({code:'*102',label:'Bubbles AI',url:'/#bubblesAICard',description:'One assistant on the QuantaPhi page'}),
  Object.freeze({code:'*103',label:'Robot Brain',url:'/#robotBrainOwner',description:'Owner-verified jobs and agent activity'}),
  Object.freeze({code:'*104',label:'Infinity Cellular',url:'/cellular/',description:'Radio network readiness; not live LTE'}),
  Object.freeze({code:'*105',label:'Infinity Phone',url:'/phone/',description:'Web calling and personal line'})
 ]);
 const ALIASES=Object.freeze({'quanta':'*100','quantaphi':'*100','search':'*101','platinum':'*101','bubbles':'*102','brain':'*103','robot':'*103','cellular':'*104','infinity':'*105'});
 function resolve(raw){
  const input=String(raw||'').trim().toLowerCase().replace(/\s+/g,' ');
  if(!input||input.length>40)return null;
  const code=ALIASES[input]||input;
  return ENTRIES.find(x=>x.code===code)||null;
 }
 function internalPath(entry){
  if(!entry||!ENTRIES.includes(entry))return null;
  return entry.url;
 }
 return Object.freeze({entries:ENTRIES,resolve,internalPath});
});
