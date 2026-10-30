import test from 'node:test';
import assert from 'node:assert/strict';
import {candidate,sourceOnDomain,CHECKS,surveyFinding,githubReviewUrl} from '../infinity-inclusion-survey.mjs';

test('domain-only survey accepts public HTTPS and rejects account or private/internal hosts',()=>{
 assert.deepEqual(candidate('https://www.ebay.com/'),{host:'www.ebay.com',origin:'https://www.ebay.com/'});
 for(const input of ['http://www.ebay.com/','javascript:alert(1)','https://127.0.0.1/',
  'https://localhost/','https://intranet.internal/','https://user:secret@example.org/','https://example.org:8443/']){
  assert.equal(candidate(input),null,input);
 }
});
test('index evidence is constrained to the nominated official hostname',()=>{
 const check=CHECKS.find(x=>x.id==='privacy');
 const data={results:[
  {title:'Official privacy notice',url:'https://www.ebay.com/help/privacy'},
  {title:'Privacy redirection trap',url:'https://www.ebay.com.evil.example/privacy'},
  {title:'Third-party privacy commentary',url:'https://review.example/privacy'}]};
 const found=surveyFinding(check,data,'www.ebay.com');
 assert.equal(found.confirmed,true);
 assert.equal(found.evidence.length,1);
 assert.equal(found.evidence[0].url,'https://www.ebay.com/help/privacy');
 assert.equal(sourceOnDomain('https://www.ebay.com.evil.example/privacy','www.ebay.com'),null);
});
test('missing evidence creates a verification suggestion, not a failed brand judgment',()=>{
 const item=surveyFinding(CHECKS[0],{results:[]},'www.ebay.com');
 assert.equal(item.confirmed,false);assert.match(item.action,/verify/i);
 const issue=new URL(githubReviewUrl({host:'www.ebay.com'},[item]));
 assert.equal(issue.host,'github.com');assert.match(issue.searchParams.get('body'),/Not confirmed by this search/);
 assert.match(issue.searchParams.get('body'),/do not approve automatically/i);
});
