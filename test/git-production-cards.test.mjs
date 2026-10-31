import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GIT_APP_CARDS,GIT_PRODUCTION_CHAIN,gitRepoUrl,gitCardRoute,nextGitStage,mergedLinePreview} from '../git-production-core.mjs';
import {githubCopilotRequest} from '../workers/bubbles-connections/github-copilot-api.mjs';
import {lookupQuickCard,searchQuickCards} from '../quick-card-search-core.mjs';
const moduleSource=readFileSync(new URL('../git-production-cards.mjs',import.meta.url),'utf8');
const source=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const reviewer=readFileSync(new URL('../workers/bubbles-connections/consent.mjs',import.meta.url),'utf8');
const sha='a'.repeat(40);
const args={accessToken:'server-only-test-token',repository:'testowner/demo'};
const mock=fn=>async(url,opts)=>Response.json(fn(new URL(url),opts));
test('every known Git application has an original-repository card and Gitcoin is the final stage',()=>{
 assert.equal(new Set(GIT_APP_CARDS.map(x=>x.id)).size,GIT_APP_CARDS.length);
 assert.equal(GIT_APP_CARDS.length,12);
 assert.equal(GIT_PRODUCTION_CHAIN[0].id,'copilot');
 assert.equal(GIT_PRODUCTION_CHAIN.at(-1).id,'gitcoin');
 for(const stage of GIT_APP_CARDS){assert.equal(new URL(gitRepoUrl(stage.repo)).hostname,'github.com');assert.ok(stage.role);}
 assert.equal(nextGitStage('gitpub').id,'git-stream');
 assert.equal(nextGitStage('git-stream').id,'gitcoin');
 assert.equal(nextGitStage('gitcoin'),null);
 assert.match(gitCardRoute('gitpro','testowner/demo',12),/card=source-gitpro&repo=testowner%2Fdemo&pr=12/);
});
test('git project names discover their real cards and open deep links, not third-party login imitations',()=>{
 for(const id of ['gitpal','gitpro','gitflow','gitcoin','gitpin','gitpub','git-stream','gitmap']){
  const card=lookupQuickCard(id);
  assert.equal(card.route,'/?card=source-'+id);
  assert.ok(card.official.startsWith('https://github.com/www-infinity4/'));
  assert.ok(searchQuickCards(id,{limit:8}).some(item=>item.id===id),id);
 }
});
test('on-card Git family preserves editable instructions and authentic connection scope',()=>{
 assert.match(source,/mountGitProductionCards\(cards,mountCardTools\)/);
 for(const word of ['Load my GitHub work','Inspect PR evidence','Post instructions on PR',
  'Prepare Bubbles evidence handoff','Check gates & merge PR','Check verified merged lines'])assert.ok(moduleSource.includes(word),word);
 assert.match(moduleSource,/AccountConnections/);
 assert.match(moduleSource,/connection.*session|connection.*authorization|existing GitHub authorization/);
 assert.doesNotMatch(moduleSource,/localStorage|document\.cookie|GHP_TOKEN|accessToken:/);
 assert.match(reviewer,/'prs','details','issues','merged','build','feedback','merge'/);
 assert.match(reviewer,/const needsWrite=!\['prs','details','issues','merged'\]/);
});
test('Gitpal sends a consented evidence-only AI review through the existing Bubbles event, not a write tool',()=>{
 assert.match(moduleSource,/bubbles:ai-consult/);
 assert.match(moduleSource,/mode:'gemini_claude_review'/);
 assert.match(moduleSource,/window\.confirm\('Send this selected GitHub issue/);
 assert.match(moduleSource,/if\(accepted\)\{setStatus\('AI review accepted by Bubbles/);
 assert.doesNotMatch(moduleSource,/AI review.*action:'merge'/);
});
test('Gitcoin preview deduplicates merge receipts and never claims minted wallet credits',()=>{
 const one={number:8,mergeCommitSha:sha,eligibleAddedLines:120};
 assert.deepEqual(mergedLinePreview({merges:[one,one],partial:true}),{
  total:120,merges:1,partial:true,gitsMinted:null,
  note:'Read-only sample of verified merged code additions, not an Infinity wallet balance or minted Gits.'
 });
 assert.equal(mergedLinePreview({merges:[{number:8,mergeCommitSha:'bad',eligibleAddedLines:120}]}).total,0);
});
test('original Copilot issue instructions are readable only with a verified server access token',async()=>{
 const result=await githubCopilotRequest({...args,action:'issues'},mock(u=>{
  assert.match(u.pathname,/\/issues$/);
  return [
   {number:3,title:'Infinity Copilot: Build a database',body:'Requested through QuantaPhi.\n\nCreate Cloudflare D1 with tables',state:'open'},
   {number:4,title:'ordinary issue',body:'other',state:'open'},
   {number:5,title:'Infinity Copilot: leaked PR',pull_request:{url:'https://github.com/'},body:'not an issue'}
  ];
 }));
 assert.equal(result.issues.length,1);assert.match(result.issues[0].instruction,/Cloudflare D1/);
 await assert.rejects(githubCopilotRequest({...args,action:'issues',accessToken:''},()=>assert.fail()),/connection_not_verified/);
});
test('Gitcoin code-line report requires merged SHA evidence, excludes docs and build output, never mints',async()=>{
 const seen=[];
 const result=await githubCopilotRequest({...args,action:'merged'},mock(u=>{
  seen.push(u.pathname);
  if(u.pathname.endsWith('/pulls'))return [
    {number:8,merged_at:'2026-10-30T12:00:00Z',merge_commit_sha:sha,html_url:'https://github.com/testowner/demo/pull/8'},
    {number:9,merged_at:null,merge_commit_sha:sha},
    {number:10,merged_at:'2026-10-29T12:00:00Z',merge_commit_sha:'not-sha'}
  ];
  if(u.pathname.endsWith('/pulls/8/files'))return [
   {filename:'src/app.ts',additions:55},
   {filename:'README.md',additions:1000},
   {filename:'dist/bundle.js',additions:1500},
   {filename:'src/style.css',additions:12},
   {filename:'node_modules/lib.js',additions:500}
  ];
  throw Error('unrecognized Github endpoint '+u.pathname);
 }));
 assert.deepEqual(seen,['/repos/testowner/demo/pulls','/repos/testowner/demo/pulls/8/files']);
 assert.equal(result.eligibleAddedLines,67);
 assert.equal(result.countedMerges,1);
 assert.equal(result.gitsMinted,null);
 assert.equal(result.walletVerified,false);
 assert.equal(result.merges[0].mergeCommitSha,sha);
});
