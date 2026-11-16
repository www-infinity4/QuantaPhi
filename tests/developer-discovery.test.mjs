import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEVELOPMENT_TOPICS,OFFICIAL_DEVELOPER_SOURCES,buildGithubSearchURL,normalizeGithubResult,
 classifyProposal,buildReviewIssueURL,existingCapabilityFor,validateIndexedResource,cleanProposalText,
 summarizeGithubPage
} from '../developer-discovery-core.mjs';

test('library offers many meaningful development areas instead of five hardcoded cards',()=>{
 assert.ok(DEVELOPMENT_TOPICS.length>=20);
 assert.equal(new Set(DEVELOPMENT_TOPICS.map(x=>x.id)).size,DEVELOPMENT_TOPICS.length);
 for(const item of DEVELOPMENT_TOPICS){
  assert.ok(item.query && item.label);
  assert.ok(/in:name,description|topic:/.test(item.query));
 }
 assert.ok(OFFICIAL_DEVELOPER_SOURCES.length>=6);
 assert.ok(OFFICIAL_DEVELOPER_SOURCES.every(x=>new URL(x.url).protocol==='https:'));
});

test('GitHub search uses a real public repository API with encoded topic, paging and bounded terms',()=>{
 const url=new URL(buildGithubSearchURL('profiles',2,'big pictures'));
 assert.equal(url.origin,'https://api.github.com');
 assert.equal(url.pathname,'/search/repositories');
 assert.equal(url.searchParams.get('per_page'),'40');
 assert.equal(url.searchParams.get('page'),'2');
 assert.match(url.searchParams.get('q'),/profile/i);
 assert.match(url.searchParams.get('q'),/big pictures/);
 assert.throws(()=>buildGithubSearchURL('profiles',11),/page/);
 assert.throws(()=>buildGithubSearchURL('invalid',1),/topic/);
});

test('source cards are legitimate GitHub projects and carry license-review status, never executable code',()=>{
 const repo={id:125,full_name:'example-org/ui-kit',html_url:'https://github.com/example-org/ui-kit',
  name:'ui-kit',description:'Accessible controls',fork:false,archived:false,disabled:false,
  owner:{avatar_url:'https://avatars.githubusercontent.com/u/1234?v=4'},
  license:{spdx_id:'MIT'},stargazers_count:34,pushed_at:'2026-10-19T00:00:00Z'};
 const x=normalizeGithubResult(repo);
 assert.equal(x.source,'GitHub');
 assert.equal(x.id,'github-125');
 assert.equal(x.license,'MIT');
 assert.equal(x.licenseStatus,'review-license-before-reuse');
 assert.equal(x.image,'https://github.githubassets.com/favicons/favicon.svg');
 assert.equal(x.url,'https://github.com/example-org/ui-kit');
 assert.equal(normalizeGithubResult({...repo,html_url:'https://evil.example/project'}),null);
 assert.equal(normalizeGithubResult({...repo,fork:true}),null);
 assert.equal(normalizeGithubResult({...repo,archived:true}),null);
 assert.equal(normalizeGithubResult({...repo,owner:{avatar_url:'javascript:alert(1)'}}),null);
});

test('partial profile feature is not falsely classified as missing or complete',()=>{
 const known=existingCapabilityFor('profiles');
 assert.equal(known.status,'partial');
 assert.match(known.note,/session/i);
 const proposed=classifyProposal('profiles','Add account-saved public profiles with avatar and display name');
 assert.equal(proposed.status,'review_existing_partial');
 assert.equal(proposed.autoPublish,false);
 assert.equal(proposed.reviewRequired,true);
});

test('unsafe site-wide explicit content or injection requests cannot produce a proposal issue URL',()=>{
 for(const bad of [
  'Put dick pics all over the homepage',
  'Place pornography as every advertisement',
  '<script>alert(1)</script>',
  'Steal user passwords from profile page',
  'Remove all safety and moderation checks'
 ]){
  const verdict=classifyProposal('carousels',bad);
  assert.equal(verdict.status,'blocked',bad);
  assert.equal(verdict.autoPublish,false);
  assert.equal(buildReviewIssueURL({topic:'carousels',idea:bad,source:null}),null);
 }
});

test('review proposal URL requires explicit visitor action, no secrets, and has no merge or deploy authority',()=>{
 assert.equal(buildReviewIssueURL({topic:'profiles',idea:'',source:null}),null);
 const idea='Add editable public display names and accessible avatar controls';
 const url=new URL(buildReviewIssueURL({topic:'profiles',idea,source:{url:'https://github.com/example-org/ui-kit',label:'ui-kit'}}));
 assert.equal(url.origin,'https://github.com');
 assert.equal(url.pathname,'/www-infinity4/QuantaPhi/issues/new');
 assert.match(url.searchParams.get('body'),/Requires owner approval/);
 assert.match(url.searchParams.get('body'),/Existing site status: partial/i);
 assert.doesNotMatch(url.searchParams.get('body'),/Approved to deploy|Auto-merge authorized/i);
 assert.equal(cleanProposalText('abc\0def').includes('\0'),false);
 assert.equal(buildReviewIssueURL({topic:'profiles',idea:'My SSN 123-45-6789 is here',source:null}),null);
});

test('GitHub response deduplicates by repository id and reports actual page count, not made-up thousands',()=>{
 const r={items:[{
  id:3,full_name:'foo/bar',name:'bar',html_url:'https://github.com/foo/bar',fork:false,archived:false,
  disabled:false,owner:{avatar_url:'https://avatars.githubusercontent.com/u/1?v=4'},description:'A UI lib'
 },{
  id:3,full_name:'foo/bar',name:'bar',html_url:'https://github.com/foo/bar',fork:false,archived:false,
  disabled:false,owner:{avatar_url:'https://avatars.githubusercontent.com/u/1?v=4'},description:'A UI lib'
 }],total_count:8204,incomplete_results:false};
 const out=summarizeGithubPage(r);
 assert.equal(out.items.length,1);
 assert.equal(out.reportedMatches,8204);
 assert.equal(out.searchCap,1000);
 assert.equal(out.incomplete,false);
});

test('indexed candidate cards cannot display mutable user-uploaded avatars or unreviewed image URLs',()=>{
 const row={id:903,full_name:'safe/design-kit',name:'design-kit',html_url:'https://github.com/safe/design-kit',
  description:'Accessible UI design patterns',fork:false,archived:false,disabled:false,
  owner:{avatar_url:'https://avatars.githubusercontent.com/u/2?v=4'},license:{spdx_id:'MIT'}};
 const source=normalizeGithubResult(row,'design-systems');
 assert.equal(source.image,'https://github.githubassets.com/favicons/favicon.svg');
 assert.equal(validateIndexedResource(source)?.id,source.id);
 assert.equal(validateIndexedResource({...source,image:'https://avatars.githubusercontent.com/u/2?v=4'}),null);
 assert.equal(validateIndexedResource({...source,url:'https://another-host.example/safe/design-kit'}),null);
 assert.equal(validateIndexedResource({...source,label:'Porn imagery'}),null);
});
