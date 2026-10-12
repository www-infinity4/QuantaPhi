/* Conservative seller intake rules: client-side guidance only, never a substitute for server moderation. */
(function(root){
'use strict';
const groups=[
 {id:'weapons',words:/\b(?:firearms?|rifles?|shotguns?|handguns?|ammunition|ammo|grenades?|explosives?|switchblades?|tasers?)\b/i,reason:'Weapon, ammunition or explosive listings require rejection under Shop Phi seller policy.'},
 {id:'illegal-drugs',words:/\b(?:cocaine|heroin|methamphetamine|fentanyl|lsd|illegal drugs?)\b/i,reason:'Illegal and controlled drug sales are not supported.'},
 {id:'counterfeit',words:/\b(?:counterfeit|fake designer|unauthorized replica|forged certificate|stolen goods?)\b/i,reason:'Counterfeit, forged, or stolen merchandise is not permitted.'},
 {id:'restricted',words:/\b(?:prescription (?:pills?|medications?)|tobacco|cigarettes?|vapes?|nicotine|sex dolls?|pornography|human remains?|personal identity documents?|social security numbers?)\b/i,reason:'This restricted product category cannot be sold through Shop Phi.'}
];
function evaluate(data={}){
 const text=[data.title,data.description].map(x=>String(x||'')).join(' ').slice(0,21000);
 const match=groups.find(g=>g.words.test(text));
 if(match)return {status:'blocked',reason:match.reason,policyId:match.id};
 if(!String(data.title||'').trim()&&!Array.isArray(data.mediaIds))return {status:'needs_review',reason:'Item identity must be described or photographed.'};
 const suspectedCoin=/\b(?:coin|dime|quarter|nickel|penny|silver dollar|morgan dollar|peace dollar|numismatic|bullion)\b/i.test(text);
 if(suspectedCoin){
  if((data.mediaIds||[]).length<2)return {status:'needs_review',reason:'Photograph both faces of the actual coin plus important marks. Photographs alone cannot certify authenticity.'};
  return {status:'needs_review',reason:'Coin requires obverse/reverse, condition and authenticity checks; never invent numeric grade, mint mark or verified value.'};
 }
 return {status:'needs_review',reason:'Human-readable evidence and server-side moderation are required before public listing.'};
}
root.ShopPhiPolicy=Object.freeze({evaluate,groups:groups.map(x=>x.id)});
})(typeof window==='undefined'?globalThis:window);
