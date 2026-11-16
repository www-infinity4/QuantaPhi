// Source-only reward rules for authenticated Bubbles/Robot Brain jobs.
// A proposal is NOT a paid wallet event. Only verified wallet settlement
// may mark payout complete, and one commit may have only one recipient.
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const REPO=/^www-infinity4\/[\w.-]+$/;
export const COMMIT_REWARD_POLICY=Object.freeze({
 repair:'STARCOIN',
 fullSite:'INFINITY',
 amount:1,
 requiresCommitVerification:true,
 requiresWalletRecipient:true,
 requiresSearchAndPublishedHtmlForSite:true
});
function siteEvidence(site,commit){
 if(!site||site.searchReceipt?.verified!==true||!/^.{4,300}$/.test(site.searchQuery||''))return false;
 if(site.publishedVerified!==true||!/^https:\/\/(?:[\w.-]+\.)?quantaphi\.org\/|^https:\/\/www-infinity4\.github\.io\//.test(site.url||''))return false;
 if(!DIGEST.test(site.htmlSha256||''))return false;
 if(!/^(?:[\w.-]+\/)*index\.html$/.test(site.htmlPath||''))return false;
 return commit.files?.some(f=>f.filename===site.htmlPath&&['added','modified'].includes(f.status));
}
export function earnedWork(quant,commit){
 const attempt=quant?.attempts?.findLast(a=>['committed_unverified','deployed_verified'].includes(a.status)&&a.testsPassed===true&&SHA.test(a.commitSha||''));
 if(!attempt||commit?.sha!==attempt.commitSha||!commit.files?.length||commit.files.length>12||!REPO.test(quant.repository||''))return null;
 const likelySite=commit.files.some(f=>f.status==='added'&&/(?:^|\/)index\.html$/.test(f.filename)&&f.additions>=20&&/<html\b/i.test(f.patch||''));
 const validFull=attempt.status==='deployed_verified'&&siteEvidence(quant.site,commit);
 // Do not downgrade a finished website to a StarCoin merely because a search,
 // HTML hash, or deployment receipt is missing. Such builds await review.
 if(likelySite&&!validFull)return null;
 const meta={
  policy:'commit-rewards-v2',amount:1,quantId:quant.id,repository:quant.repository,commitSha:attempt.commitSha,
  commitUrl:'https://github.com/'+quant.repository+'/commit/'+attempt.commitSha,
  summary:String(attempt.summary||'').slice(0,500),
  kind:validFull?'full-site-build':'repair',
  ...(validFull?{searchReceiptVerified:true,sitePublishedVerified:true}:{}),
  sourceFiles:commit.files.slice(0,12).map(f=>({path:f.filename,status:f.status,additions:Number(f.additions)||0})),
  ...(validFull?{searchQuery:quant.site.searchQuery,searchReceiptId:quant.site.searchReceipt.id||null,
    websiteUrl:quant.site.url,htmlPath:quant.site.htmlPath,htmlSha256:quant.site.htmlSha256,
    htmlSourceUrl:'https://github.com/'+quant.repository+'/blob/'+attempt.commitSha+'/'+quant.site.htmlPath}:{}),
 };
 return {...meta,asset:validFull?'INFINITY':'STARCOIN'};
}
export function rewardReadout(reward){
 if(!reward)return null;
 return {kind:reward.kind,asset:reward.asset,amount:reward.amount,repository:reward.repository,
  commitSha:reward.commitSha,commitUrl:reward.commitUrl,summary:reward.summary,
  files:reward.sourceFiles,websiteUrl:reward.websiteUrl||null,searchQuery:reward.searchQuery||null,
  htmlPath:reward.htmlPath||null,htmlSha256:reward.htmlSha256||null,
  ledgerStatus:'unsettled_requires_authenticated_wallet_receipt'};
}
