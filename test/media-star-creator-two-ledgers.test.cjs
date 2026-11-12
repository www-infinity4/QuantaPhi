'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('media-star-creator.js','utf8');
test('builder explicitly asks whether curator wants paid episodes and how many free first',()=>{
 assert.match(src,/Do you want to charge.*curated episodes/i);
 assert.match(src,/How many episodes are free/i);
 assert.match(src,/Episodes.*one per line/i);
 assert.match(src,/chargeForNext/);
 assert.match(src,/freeEpisodes/);
});
test('published portable HTML does not expose gated episode source URLs',()=>{
 assert.match(src,/data-curation-policy/);
 assert.match(src,/data-payment-mode="off"/);
 assert.match(src,/Paid curated episode.*wallet/i);
 assert.match(src,/safeSource/);
 assert.doesNotMatch(src,/fred-spaces-ledger\.marvaseater\.workers\.dev/);
});
test('creator studio submits draft configuration to authenticated production registration without client wallet writes',()=>{
 assert.match(src,/registerProduction\(/);
 assert.match(src,/creatorSettings:/);
 assert.match(src,/episodes:/);
 assert.match(src,/disabled_pending/);
 assert.doesNotMatch(src,/UPDATE accounts SET star_coins/);
 assert.doesNotThrow(()=>new Function(src));
});

function renderCard(options) {
 class Element {
  constructor(){this.children=[];this.value='';this.textContent='';this.style={}}
  append(...children){this.children.push(...children)}
  addEventListener(){}
  setAttribute(){}
 }
 const window={};
 const document={getElementById:id=>id==='mediaStarCreator'?new Element():null,createElement:()=>new Element()};
 vm.runInNewContext(src,{window,document,URL,console});
 return window.PhiMediaStarAsset.html(options);
}
test('real exported preview hides episode 2 URL while showing free episode 1',()=>{
 const first='https://www.youtube.com/watch?v=AbCdEf12345';
 const locked='https://www.youtube.com/watch?v=Locked67890';
 const html=renderCard({title:'Creator playlist',url:first,description:'Real original show',
  chargeForNext:true,freeEpisodes:1,episodeLinks:'Second episode | '+locked});
 assert.ok(html.includes(first),'the free first episode stays playable');
 assert.ok(!html.includes(locked),'the paid second source must never be in public HTML');
 assert.match(html,/Paid curated episode.*1 StarCoin/);
 assert.match(html,/data-payment-mode="off"/);
});
test('all-free collection exposes original sources but never charges',()=>{
 const next='https://www.youtube.com/watch?v=Free9876543';
 const html=renderCard({title:'Free playlist',url:'https://www.youtube.com/watch?v=Free1234567',description:'Public',
  chargeForNext:false,freeEpisodes:1,episodeLinks:'Next | '+next});
 assert.ok(html.includes(next));
 assert.match(html,/data-payment-mode="off"/);
});
test('zero-free paid collection cannot leak the first episode source in the manifest',()=>{
 const locked='https://www.youtube.com/watch?v=LockedFirst0';
 const html=renderCard({title:'Paid playlist',url:locked,description:'Paid',
  chargeForNext:true,freeEpisodes:0,episodeLinks:''});
 assert.ok(!html.includes(locked));
 assert.match(html,/No payment or source link/);
});

test('creator ledger view reads pending Infinity awards from signed backend, never fabricates wallet credits',()=>{
 assert.match(src,/My Infinity view awards/);
 assert.match(src,/productionClaims\(/);
 assert.match(src,/pendingInfinityViewAwards/);
 assert.match(src,/not spendable/i);
 assert.doesNotMatch(src,/\bMintStarCoin\s*\(/);
});

test('creator rights proof is an explicit signed pending claim, never an automatic issuance',()=>{
 assert.match(src,/Submit creator rights claim/);
 assert.match(src,/claimMediaStarCreator\(/);
 assert.match(src,/rightsAttestation:true/);
 assert.match(src,/registeredContentId/);
 assert.match(src,/pending_identity_and_rights_review/);
 assert.doesNotMatch(src,/unverified_claim_paid/);
});
